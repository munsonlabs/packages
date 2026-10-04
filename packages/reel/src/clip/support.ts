import { canEncodeAudio, getFirstEncodableVideoCodec, type Input, type InputAudioTrack, type InputVideoTrack } from 'mediabunny'
import { planCrop } from '@/clip/crop'
import { ClipError } from '@/utils/errors'
import { openInput, readError, resolveSource } from '@/sources/source'
import type { CanClipResult, ClipSource, CodecProbe, CropOptions, OutputPlan, SourceInfo, Support } from '@/types'

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

async function probeVideoEncoder(codec: string, width: number, height: number): Promise<CodecProbe> {
  try {
    const result = await VideoEncoder.isConfigSupported({ codec, width, height, bitrate: 6_000_000, framerate: 30 })
    return { codec, supported: result.supported === true }
  } catch {
    return { codec, supported: false }
  }
}

async function probeAudioEncoder(codec: string): Promise<CodecProbe> {
  try {
    const result = await AudioEncoder.isConfigSupported({ codec, sampleRate: 48_000, numberOfChannels: 2, bitrate: 128_000 })
    return { codec, supported: result.supported === true }
  } catch {
    return { codec, supported: false }
  }
}

async function probeVideoDecoder(codec: string, codedWidth: number, codedHeight: number): Promise<CodecProbe> {
  try {
    const result = await VideoDecoder.isConfigSupported({ codec, codedWidth, codedHeight })
    return { codec, supported: result.supported === true }
  } catch {
    return { codec, supported: false }
  }
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

/**
 * Reports what this browser can do for clipping, probing `VideoEncoder.isConfigSupported`,
 * `AudioEncoder.isConfigSupported` and `VideoDecoder.isConfigSupported` directly with fixed codec
 * strings, so the answer can be logged and compared across browsers. Clips are H.264 + AAC MP4s: without
 * the H.264 encoder nothing can be clipped; without the AAC encoder only AAC sources keep their sound.
 */
export async function support(): Promise<Support> {
  const secureContext = globalThis.isSecureContext !== false
  const none = (codec: string): CodecProbe => ({ codec, supported: false })
  if (!hasWebCodecs()) {
    return {
      webcodecs: false,
      secureContext,
      decode: { avc: none('avc1.64001f') },
      video: { avc: none('avc1.640028') },
      audio: { aac: none('mp4a.40.2') },
    }
  }
  const [decodeAvc, avc, aac] = await Promise.all([
    probeVideoDecoder('avc1.64001f', 1280, 720),
    probeVideoEncoder('avc1.640028', 1080, 1920),
    typeof AudioEncoder !== 'undefined' ? probeAudioEncoder('mp4a.40.2') : none('mp4a.40.2'),
  ])
  return { webcodecs: true, secureContext, decode: { avc: decodeAvc }, video: { avc }, audio: { aac } }
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

/**
 * Answers whether `source` can be clipped in this browser, and if so what happens to its audio.
 * It reads only the container header, never media. It never throws: every blocker comes back as
 * `{ ok: false, reason, message }`.
 */
export async function canClip(source: ClipSource, options: { crop?: CropOptions; audio?: boolean } = {}): Promise<CanClipResult> {
  let inspected: Inspected | undefined
  try {
    inspected = await inspect(source)
    const { info, audio } = inspected
    const crop = planCrop(info.width, info.height, options.crop)
    const plan = await planOutput({
      width: crop.outputWidth,
      height: crop.outputHeight,
      ...(await audioRequest(audio)),
      audio: options.audio,
    })
    if (!plan) {
      throw noVideoEncoder(crop.outputWidth, crop.outputHeight)
    }
    return { ok: true, info, plan }
  } catch (error) {
    const clipError = error instanceof ClipError ? error : readError(error, '')
    return { ok: false, reason: clipError.reason, message: clipError.message }
  } finally {
    inspected?.input.dispose()
  }
}
