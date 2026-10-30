import { canEncodeAudio, getFirstEncodableVideoCodec } from 'mediabunny'
import { planCrop } from './crop'
import { selectTracks } from './source'
import { ERROR_EMPTY_RANGE, ERROR_NO_VIDEO_ENCODER, WARNING_AUDIO_UNAVAILABLE } from '@/constants'
import type { OutputPlan, PlanRequest, SourceInfo, SpliceOptions } from '@/types/splice'
import type { ClipPlan, ClipRange, OpenedSource } from '@/types/internal'

export function getClipRange(info: SourceInfo, options: SpliceOptions): ClipRange {
  const start = Math.max(0, options.start ?? 0)
  const end = Math.min(info.duration, options.end ?? info.duration)

  if (end <= start) throw new Error(ERROR_EMPTY_RANGE(start, end, info.duration))
  return { start, end }
}

/**
 * Plans the clip's size and crop, which tracks to read and whether it has audio. Throws if this
 * browser can't encode the video, and warns if the audio has to go.
 */
export async function planClip(source: OpenedSource, options: SpliceOptions): Promise<ClipPlan> {
  const { info } = source
  const { width, height, draw } = planCrop(info.width, info.height, options.crop)
  const need = { width: Math.ceil(draw.width), height: Math.ceil(draw.height) }
  const { video, audio } = await selectTracks(source, need)
  const plan = await planOutput({ width, height, audioTrack: audio, audio: options.audio })
  const warn = options.onWarning ?? console.warn

  if (!plan) throw new Error(ERROR_NO_VIDEO_ENCODER(width, height))
  if (plan.audio === 'unavailable') warn(WARNING_AUDIO_UNAVAILABLE(info.audioCodec))

  const hasAudio = plan.audio === 'copy' || plan.audio === 'encode'
  return { width, height, draw, hasAudio, video, audio }
}

/**
 * Plans a clip, which is always an MP4 with H.264 video and AAC audio. Resolves null if there's no
 * H.264 encoder for the clip's size. AAC is copied packet for packet, which needs no encoder and
 * keeps the sound in Firefox. Other audio gets encoded to AAC if the browser can.
 */
export async function planOutput(request: PlanRequest): Promise<OutputPlan | null> {
  const { width, height, audioTrack } = request
  const canEncodeAvc = await getFirstEncodableVideoCodec(['avc'], { width, height })
  const noAudio = request.audio === false || !audioTrack
  const sourceIsAac = (await audioTrack?.getCodec()) === 'aac'
  const needsEncoder = !noAudio && !sourceIsAac
  /**
   * Reading these can download a segment of an HLS stream, so we only do it when the audio needs
   * encoding.
   */
  const sampleRate = (needsEncoder && (await audioTrack?.getSampleRate())) || 48_000
  const numberOfChannels = (needsEncoder && (await audioTrack?.getNumberOfChannels())) || 2
  const canEncodeAac = needsEncoder ? await canEncodeAudio('aac', { sampleRate, numberOfChannels }) : null

  if (!canEncodeAvc) return null
  if (noAudio) return { audio: 'none' }
  if (sourceIsAac) return { audio: 'copy' }
  if (canEncodeAac) return { audio: 'encode' }
  return { audio: 'unavailable' }
}
