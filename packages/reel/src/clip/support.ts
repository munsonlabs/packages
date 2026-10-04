import { canEncodeAudio, getFirstEncodableVideoCodec, HlsInputFormat, type Input, type InputAudioTrack, type InputVideoTrack } from 'mediabunny'
import { planCrop } from '@/clip/crop'
import { ClipError } from '@/utils/errors'
import { openInput, readError, resolveSource } from '@/sources/source'
import { canDecodeCandidate, canDecodeTrack, listVideoCandidates, pairedAudio, rankCandidates, type VideoCandidate } from '@/sources/tracks'
import type { CanClipResult, ClipBlocker, ClipSource, CropOptions, OutputPlan, PlaylistCache, SourceInfo, TrackChoice } from '@/types'

export function hasWebCodecs(): boolean {
  return (
    globalThis.isSecureContext !== false &&
    typeof VideoEncoder !== 'undefined' &&
    typeof VideoDecoder !== 'undefined' &&
    typeof VideoFrame !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined'
  )
}

export interface PlanRequest {
  width: number
  height: number
  sourceAudio: string | null
  audio?: boolean
}

export function noVideoEncoder(width: number, height: number): ClipError {
  return new ClipError('no-video-encoder', `This browser has no H.264 encoder for a ${width}x${height} clip.`)
}

/**
 * Plans a clip (always MP4, H.264 + AAC): `null` without an H.264 encoder at the clip's size. AAC audio
 * is copied, so it needs no encoder (which keeps sound in Firefox); other audio is encoded as AAC where
 * the browser can, else left out (`'unavailable'`).
 */
export async function planOutput(request: PlanRequest): Promise<OutputPlan | null> {
  if (!(await getFirstEncodableVideoCodec(['avc'], { width: request.width, height: request.height }))) {
    return null
  }
  if (request.audio === false || request.sourceAudio === null) {
    return { audio: 'none' }
  }
  if (request.sourceAudio === 'aac') {
    return { audio: 'copy' }
  }
  // Deliberately no Opus fallback: a non-AAC source in a browser without an AAC encoder (Firefox, Safari
  // before 26, Linux Chromium) makes a silent clip. Opus-in-MP4 would keep the sound, since Firefox can
  // encode Opus, but some social apps reject it. To bring it back for this case only, try
  // canEncodeAudio('opus') before 'unavailable' and write Opus into the MP4.
  return { audio: (await canEncodeAudio('aac', { sampleRate: 48_000, numberOfChannels: 2 })) ? 'encode' : 'unavailable' }
}

export interface Inspected {
  input: Input
  candidates: VideoCandidate[]
  reference: VideoCandidate
  audio: InputAudioTrack | null
  hls: boolean
  info: SourceInfo
}

/**
 * Opens and checks a source: readable, with a video track this browser can decode; `info` describes the
 * largest such track. Nothing past the header is read (for HLS: the master and one media playlist, with
 * sizes and codecs from the playlist). Throws a {@link ClipError} otherwise, disposing the input; on
 * success the caller owns `input`.
 */
export async function inspect(source: ClipSource, cache?: PlaylistCache): Promise<Inspected> {
  if (!hasWebCodecs()) {
    throw new ClipError(
      'no-webcodecs',
      'This browser lacks WebCodecs (VideoEncoder/VideoDecoder) or OffscreenCanvas, or the page is not a secure context.',
    )
  }
  const resolved = await resolveSource(source)
  const input = openInput(resolved, cache)
  try {
    let candidates: VideoCandidate[]
    let hls: boolean
    try {
      hls = (await input.getFormat()) instanceof HlsInputFormat
      candidates = await listVideoCandidates(input)
    } catch (error) {
      throw readError(error, resolved)
    }
    if (candidates.length === 0) {
      throw new ClipError('no-video', 'The source has no video track.')
    }
    let reference: VideoCandidate | undefined
    for (const candidate of rankCandidates(candidates, 'largest', null)) {
      if (await canDecodeCandidate(candidate, hls)) {
        reference = candidate
        break
      }
    }
    if (!reference) {
      const first = candidates[0]
      const codec = first.codec ?? (await first.track.getCodec()) ?? 'unknown'
      throw new ClipError('undecodable-video', `This browser cannot decode the source's video (${codec}). Encrypted tracks also land here.`)
    }
    let duration: number
    let audio: InputAudioTrack | null
    try {
      audio = await pairedAudio(input, reference.track)
      // Over every track, an HLS duration would read the last segment of every variant; the
      // playlist already says how long the reference variant runs.
      duration = hls
        ? ((await input.getDurationFromMetadata([reference.track])) ?? (await input.computeDuration([reference.track])))
        : await input.computeDuration()
    } catch (error) {
      throw readError(error, resolved)
    }
    const info: SourceInfo = {
      duration,
      width: reference.width,
      height: reference.height,
      videoCodec: reference.codec,
      audioCodec: audio ? await audio.getCodecParameterString() : null,
      resolved,
      videoTracks: candidates.map(({ track: _track, ...rest }) => rest),
    }
    return { input, candidates, reference, audio, hls, info }
  } catch (error) {
    input.dispose()
    throw error
  }
}

export interface Selected {
  video: InputVideoTrack
  audio: InputAudioTrack | null
  candidate: VideoCandidate
}

/**
 * The track to read for `need` (see {@link rankCandidates}), the first in preference order this browser
 * can decode, with its paired audio. Only that track's media is ever read: an HLS variant is ruled out by
 * its playlist codec for free before its first segment is read for the real decoder configuration.
 */
export async function selectTracks(inspected: Inspected, choice: TrackChoice, need: { width: number; height: number } | null): Promise<Selected> {
  for (const candidate of rankCandidates(inspected.candidates, choice, need)) {
    try {
      if (!(await canDecodeCandidate(candidate, inspected.hls)) || (inspected.hls && !(await canDecodeTrack(candidate.track)))) {
        continue
      }
      return { video: candidate.track, audio: await pairedAudio(inspected.input, candidate.track), candidate }
    } catch (error) {
      throw readError(error, inspected.info.resolved)
    }
  }
  throw new ClipError('undecodable-video', "This browser cannot decode any of the source's video tracks.")
}

/**
 * Whether `source` can be clipped here, and what happens to its audio. Reads only the header (for HLS,
 * only playlists, through `cache`); never throws: every blocker is `{ ok: false, reason, message }`.
 */
export async function canClip(
  source: ClipSource,
  options: { crop?: CropOptions; audio?: boolean; cache?: PlaylistCache } = {},
): Promise<CanClipResult> {
  let inspected: Inspected | undefined
  try {
    inspected = await inspect(source, options.cache)
    const { info, audio } = inspected
    const crop = planCrop(info.width, info.height, options.crop)
    const plan = await planOutput({
      width: crop.outputWidth,
      height: crop.outputHeight,
      sourceAudio: audio ? await audio.getCodec() : null,
      audio: options.audio,
    })
    if (!plan) {
      throw noVideoEncoder(crop.outputWidth, crop.outputHeight)
    }
    return { ok: true, info, plan }
  } catch (error) {
    const clipError = error instanceof ClipError ? error : readError(error, '')
    // canClip encodes nothing, so its errors are always blockers, never 'encoder-stalled'.
    return { ok: false, reason: clipError.reason as ClipBlocker, message: clipError.message }
  } finally {
    inspected?.input.dispose()
  }
}
