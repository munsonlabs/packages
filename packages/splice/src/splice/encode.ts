import { BufferTarget, CanvasSource, Conversion, Mp4OutputFormat, Output, QUALITY_HIGH, VideoSampleSink } from 'mediabunny'
import type { Input, InputAudioTrack, MetadataTags } from 'mediabunny'
import { END_CARD_FRAME } from '@/constants'
import { closeEncoder, createEncoderWatchdog } from './watchdog'
import type { ClipPlan, ClipRange, EncodeVideoOptions, EncoderWatchdog, EndCard, OpenedSource, Pipeline, Scope } from '@/types/internal'

/**
 * Creates the in-memory MP4 the clip gets written to, with videoSource as the video track and tags
 * as the metadata. The source's own tags aren't copied since they might not describe the clip.
 */
export function createOutput(videoSource: CanvasSource, tags: MetadataTags): Output {
  const format = new Mp4OutputFormat({ fastStart: 'in-memory' })
  const target = new BufferTarget()
  const output = new Output({ format, target })

  output.addVideoTrack(videoSource)
  output.setMetadataTags(tags)
  return output
}

/**
 * Reads the finished clip out of the output as an MP4 Blob.
 */
export function readOutput(output: Output): Blob {
  const { buffer } = output.target as BufferTarget
  return new Blob([buffer!], { type: 'video/mp4' })
}

/**
 * Creates the canvas frames get drawn onto and the H.264 CanvasSource that encodes it, pinging the
 * watchdog on every packet. The same canvas is reused for the whole clip.
 */
export function createVideoEncoder(width: number, height: number, watchdog: EncoderWatchdog) {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d', { alpha: false })!
  const videoSource = new CanvasSource(canvas, { codec: 'avc', quality: QUALITY_HIGH, onEncodedPacket: watchdog.packet })

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  return { ctx, videoSource }
}

/**
 * Draws every frame of [start, end) onto the canvas, cropped by draw with paint on top, and encodes
 * it. Then does the end card if there is one. Nice and simple I think.
 */
export async function encodeVideo({
  video,
  videoSource,
  watchdog,
  ctx,
  draw,
  paint,
  endCard,
  start,
  end,
  onTime,
  signal,
}: EncodeVideoOptions): Promise<void> {
  const { x, y, width, height } = draw
  const samples = new VideoSampleSink(video).samples(start, end)

  for await (const sample of samples) {
    try {
      if (signal?.aborted) break
      const from = Math.max(start, sample.timestamp)
      const to = Math.min(end, sample.timestamp + sample.duration)
      if (to <= from) continue
      sample.draw(ctx, x, y, width, height)
      paint(ctx, from)
      await watchdog.wait(videoSource.add(from - start, to - from))
      onTime(to - start)
    } finally {
      sample.close()
    }
  }
  if (endCard && !signal?.aborted) await encodeEndCard(ctx, videoSource, watchdog, endCard, end - start, onTime, signal)

  signal?.throwIfAborted()
  videoSource.close()
}

/**
 * Encodes the end card after the clip at a steady 30 fps from offset, fading in over the clip's
 * last frame. It's silent, the audio stops where the clip does.
 */
async function encodeEndCard(
  ctx: OffscreenCanvasRenderingContext2D,
  videoSource: CanvasSource,
  watchdog: EncoderWatchdog,
  endCard: EndCard,
  offset: number,
  onTime: (time: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const lastFrame = new OffscreenCanvas(ctx.canvas.width, ctx.canvas.height)
  lastFrame.getContext('2d')!.drawImage(ctx.canvas, 0, 0)

  for (let time = 0; time < endCard.duration - 1e-6 && !signal?.aborted; time += END_CARD_FRAME) {
    const duration = Math.min(END_CARD_FRAME, endCard.duration - time)
    endCard.draw(ctx, time, lastFrame)
    await watchdog.wait(videoSource.add(offset + time, duration))
    onTime(offset + time)
  }
}

/**
 * Sets up the audio as a Conversion: AAC is copied, anything else is decoded and encoded as AAC.
 * The video is dropped because we have our own flow for that, and Safari shits the bed.
 */
export function createAudioConversion(input: Input, output: Output, audio: InputAudioTrack, start: number, end: number): Promise<Conversion> {
  return Conversion.init({
    input,
    output,
    composable: true,
    /**
     * Offer every track and drop everything but the audio we picked. 'primary' would grab the top
     * HLS variant's audio instead of the one we read.
     */
    tracks: 'all',
    trim: { start, end },
    video: { discard: true },
    audio: (track) => (track === audio ? { codec: 'aac' } : { discard: true }),
    showWarnings: false,
  })
}

/**
 * Creates everything the clip is written with: the video encoder, the output and, if there's audio,
 * the audio conversion. All of it gets cancelled if the splice fails, and a stalled encoder is
 * closed first so cancelling can actually finish.
 */
export async function createPipeline(
  scope: Scope,
  { input }: OpenedSource,
  plan: ClipPlan,
  { start, end }: ClipRange,
  tags: MetadataTags,
): Promise<Pipeline> {
  const watchdog = createEncoderWatchdog()
  const { ctx, videoSource } = createVideoEncoder(plan.width, plan.height, watchdog)
  const output = createOutput(videoSource, tags)
  scope.onError(() => output.cancel())

  const conversion = plan.hasAudio && plan.audio ? await createAudioConversion(input, output, plan.audio, start, end) : undefined
  if (conversion) scope.onError(() => conversion.cancel())

  /**
   * Registered last so it runs first.
   */
  scope.onError(() => watchdog.hasStalled && closeEncoder(videoSource))
  return { ctx, videoSource, watchdog, output, conversion }
}
