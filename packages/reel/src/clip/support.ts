import { canEncodeAudio, getFirstEncodableVideoCodec, type Input, type InputAudioTrack, type InputVideoTrack } from 'mediabunny'
import { ClipError } from '@/utils/errors'
import { openInput, readError, resolveSource } from '@/sources/source'
import type { ClipSource, OutputPlan, SourceInfo } from '@/types'

/** True when the APIs every clip needs exist on this page. */
export function hasWebCodecs(): boolean {
  return (
    globalThis.isSecureContext !== false &&
    typeof VideoEncoder !== 'undefined' &&
    typeof VideoDecoder !== 'undefined' &&
    typeof VideoFrame !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined'
  )
}

/** What {@link planOutput} needs to know about the clip being written. */
export interface PlanRequest {
  width: number
  height: number
  /** The source's audio codec in Mediabunny's naming (`'aac'`, `'opus'`, …), or `null` when it has none. */
  sourceAudio: string | null
  sampleRate?: number
  numberOfChannels?: number
  /** `false` drops audio on purpose. */
  audio?: boolean
}

/** The `no-video-encoder` blocker for a clip of `width` x `height`. */
export function noVideoEncoder(width: number, height: number): ClipError {
  return new ClipError('no-video-encoder', `This browser has no H.264 encoder for a ${width}x${height} clip.`)
}

/**
 * Plans a clip, which is always an MP4 with H.264 video and AAC audio: resolves `null` when this
 * browser has no H.264 encoder at the clip's size. AAC audio is copied packet for packet, so an AAC
 * source needs no audio encoder at all (which is what keeps sound in Firefox, which has none); other
 * audio is encoded as AAC where this browser can, and otherwise left out (`'unavailable'`).
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
  const options = { sampleRate: request.sampleRate ?? 48_000, numberOfChannels: request.numberOfChannels ?? 2 }
  return { audio: (await canEncodeAudio('aac', options)) ? 'encode' : 'unavailable' }
}

/** A source opened and checked, ready for a clip to be cut from it. */
export interface Inspected {
  input: Input
  video: InputVideoTrack
  audio: InputAudioTrack | null
  info: SourceInfo
}

/**
 * Resolves, opens and checks a source: it must be readable, have a video track and be decodable
 * here. Throws a {@link ClipError} otherwise, disposing the input it opened. The caller owns
 * `input` on success and must dispose it.
 */
export async function inspect(source: ClipSource): Promise<Inspected> {
  if (!hasWebCodecs()) {
    throw new ClipError(
      'no-webcodecs',
      'This browser lacks WebCodecs (VideoEncoder/VideoDecoder) or OffscreenCanvas, or the page is not a secure context.',
    )
  }
  const resolved = await resolveSource(source)
  const input = openInput(resolved)
  try {
    let video: InputVideoTrack | null
    let audio: InputAudioTrack | null
    try {
      video = await input.getPrimaryVideoTrack()
      audio = video ? await video.getPrimaryPairableAudioTrack() : await input.getPrimaryAudioTrack()
    } catch (error) {
      throw readError(error, resolved)
    }
    if (!video) {
      throw new ClipError('no-video', 'The source has no video track.')
    }
    if (!(await video.canDecode())) {
      const codec = (await video.getCodecParameterString()) ?? (await video.getCodec()) ?? 'unknown'
      throw new ClipError('undecodable-video', `This browser cannot decode the source's video (${codec}). Encrypted tracks also land here.`)
    }
    const info: SourceInfo = {
      duration: await input.computeDuration(),
      width: await video.getDisplayWidth(),
      height: await video.getDisplayHeight(),
      videoCodec: await video.getCodecParameterString(),
      audioCodec: audio ? await audio.getCodecParameterString() : null,
      resolved,
    }
    return { input, video, audio, info }
  } catch (error) {
    input.dispose()
    throw error
  }
}

/** What {@link planOutput} needs to know about a source's audio track, or that there is none. */
export async function audioRequest(audio: InputAudioTrack | null): Promise<Pick<PlanRequest, 'sourceAudio' | 'sampleRate' | 'numberOfChannels'>> {
  if (!audio) {
    return { sourceAudio: null }
  }
  return {
    sourceAudio: await audio.getCodec(),
    sampleRate: await audio.getSampleRate(),
    numberOfChannels: await audio.getNumberOfChannels(),
  }
}
