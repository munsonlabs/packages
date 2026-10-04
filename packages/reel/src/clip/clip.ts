import {
  BufferTarget,
  CanvasSource,
  Conversion,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  VideoSampleSink,
  type InputAudioTrack,
  type InputVideoTrack,
} from 'mediabunny'
import { activeCues, defaultTrackIndex } from '@/captions/cues'
import { loadCaptions } from '@/captions/fetch'
import { createCaptionPainter } from '@/render/captions'
import { planCrop, type CropPlan } from '@/clip/crop'
import { prepareEndCard, type PreparedEndCard } from '@/render/endcard'
import { clipLink, originTags } from '@/clip/origin'
import { abortReason, ClipError } from '@/utils/errors'
import { createImageCache, type ImageCache } from '@/render/image'
import { createStampPainter } from '@/render/stamp'
import { loadCaptionTrack } from '@/captions/load'
import { inspect, noVideoEncoder, planOutput, selectTracks, type Inspected } from '@/clip/support'
import { createWatermarkPainter } from '@/render/watermark'
import type { CaptionCue, ClipOptions, ClipWarning, OutputPlan } from '@/types'

type Warn = (warning: ClipWarning) => void
type Context = OffscreenCanvasRenderingContext2D

/**
 * What was decided before any frame is read: the range, the crop, the tracks to read and the output
 * plan.
 */
interface ClipPlan {
  start: number
  end: number
  crop: CropPlan
  video: InputVideoTrack
  audio: InputAudioTrack | null
  output: OutputPlan
}

async function planClip(options: ClipOptions, inspected: Inspected, warn: Warn): Promise<ClipPlan> {
  const { info } = inspected
  const start = Math.max(0, options.start ?? 0)
  const end = Math.min(info.duration, options.end ?? info.duration)
  if (!(end > start)) {
    throw new RangeError(`reel: end (${end}) must be after start (${start}) and within the source (${info.duration}s).`)
  }
  const crop = planCrop(info.width, info.height, options.crop)
  // The crop is planned on the largest track; the one read is the smallest whose crop window still
  // holds the output's pixels, e.g. the 180p variant for a 180-pixel-high clip of a 1080p stream.
  const need = {
    width: Math.ceil((crop.outputWidth * info.width) / crop.width),
    height: Math.ceil((crop.outputHeight * info.height) / crop.height),
  }
  const { video, audio } = await selectTracks(inspected, options.track ?? 'auto', need)
  const sourceAudio = audio ? await audio.getCodec() : null
  const output = await planOutput({ width: crop.outputWidth, height: crop.outputHeight, sourceAudio, audio: options.audio })
  if (!output) {
    throw noVideoEncoder(crop.outputWidth, crop.outputHeight)
  }
  if (output.audio === 'unavailable') {
    warn({
      reason: 'audio-unavailable',
      target: 'audio',
      message: `reel: the audio is left out. Clips are MP4 with AAC audio, and this browser has no AAC encoder for the source's ${sourceAudio} audio.`,
    })
  }
  return { start, end, crop, video, audio, output }
}

async function clipCues(options: ClipOptions, inspected: Inspected, plan: ClipPlan, warn: Warn): Promise<CaptionCue[]> {
  const captions = options.captions
  if (!captions) {
    return []
  }
  try {
    if (captions.cues !== undefined) {
      return await loadCaptions(captions.cues, { signal: options.signal })
    }
    const passed = captions.tracks ?? []
    const id = captions.track ?? (passed.length > 0 ? `passed:${defaultTrackIndex(passed)}` : undefined)
    if (!id) {
      return []
    }
    return await loadCaptionTrack(options.source, id, {
      start: plan.start,
      end: plan.end,
      signal: options.signal,
      resolved: inspected.info.resolved,
      tracks: passed,
      cache: options.cache,
    })
  } catch (error) {
    // An unknown track id is the caller's mistake, not a file that failed to load.
    if (options.signal?.aborted || error instanceof RangeError) {
      throw error
    }
    const detail = (error instanceof Error ? error.message : String(error)).replace(/^reel: /, '')
    warn({ reason: 'captions-unavailable', target: 'captions', message: `reel: the captions are left out. ${detail}` })
    return []
  }
}

/**
 * Everything painted over a clip frame after the video, and the card that follows the last one.
 */
interface Overlays {
  paint: (ctx: Context, time: number) => void
  card: PreparedEndCard | undefined
  lastFrame: OffscreenCanvas
}

async function prepareOverlays(options: ClipOptions, inspected: Inspected, plan: ClipPlan, images: ImageCache, warn: Warn): Promise<Overlays> {
  const { outputWidth: width, outputHeight: height } = plan.crop
  const cues = await clipCues(options, inspected, plan, warn)
  const paintCaptions = createCaptionPainter(width, height, options.captions?.style)
  const paintWatermark = options.watermark?.text ? createWatermarkPainter(width, height, options.watermark) : null
  const link = options.origin ? clipLink(options.origin, plan.start, plan.end) : null
  const lastFrame = new OffscreenCanvas(width, height)
  const [card, stampLogo] = await Promise.all([
    options.endCard
      ? prepareEndCard(options.endCard, { origin: options.origin, link, width, height, lastFrame, loadImage: images.load, warn })
      : undefined,
    options.stamp?.logo ? images.load(options.stamp.logo) : null,
  ])
  let paintStamp: ((ctx: Context) => void) | null = null
  if (options.stamp && stampLogo?.ok) {
    paintStamp = createStampPainter(width, height, stampLogo.bitmap, options.stamp)
  } else if (stampLogo && !stampLogo.ok) {
    warn({ reason: 'logo-unavailable', target: 'stamp', message: `reel: the stamp is left out. ${stampLogo.message}` })
  }
  return {
    card,
    lastFrame,
    paint(ctx, time) {
      if (cues.length > 0) {
        paintCaptions(ctx, activeCues(cues, time))
      }
      paintWatermark?.(ctx)
      paintStamp?.(ctx)
    },
  }
}

/**
 * The MP4 being written: the video track reel draws into, and the audio Conversion beside it, if
 * any.
 */
interface ClipOutput {
  output: Output
  videoSource: CanvasSource
  conversion: Conversion | undefined
}

async function openOutput(options: ClipOptions, inspected: Inspected, plan: ClipPlan, canvas: OffscreenCanvas): Promise<ClipOutput> {
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() })
  const videoSource = new CanvasSource(canvas, { codec: 'avc', quality: QUALITY_HIGH })
  output.addVideoTrack(videoSource)
  let conversion: Conversion | undefined
  const { audio } = plan
  if ((plan.output.audio === 'copy' || plan.output.audio === 'encode') && audio) {
    // AAC is copied packet for packet; anything else is decoded and encoded as AAC. Every track is
    // offered and all but the chosen video's own audio discarded: 'primary' would take the input's
    // primary audio, which for HLS belongs to the top variant, not the one read.
    conversion = await Conversion.init({
      input: inspected.input,
      output,
      composable: true,
      tracks: 'all',
      trim: { start: plan.start, end: plan.end },
      video: { discard: true },
      audio: (track) => (track === audio ? { codec: 'aac' } : { discard: true }),
      showWarnings: false,
    })
  }
  // Source tags are never carried over: they can hold things (location, device, a different
  // title) that do not describe the clip. With an origin, the clip says where it came from.
  output.setMetadataTags(options.origin && options.metadata !== false ? originTags(options.origin, plan.start, plan.end) : {})
  return { output, videoSource, conversion }
}

/**
 * Draws every frame of the clip, then the end card, into the canvas and encodes it. The crop is done by
 * drawing the whole frame scaled and shifted so the canvas edges cut it, not with a source rectangle:
 * WebKit's `drawImage(VideoFrame, sx, sy, sw, sh, ...)` ignores the source rectangle and draws the full
 * frame (WebKit 26.5), which is also why Mediabunny's own `crop` option gives squashed, uncropped video
 * in Safari. `sample.draw` applies the track's rotation, so a phone video arrives upright. Every sample
 * is closed where it is drawn.
 */
async function encodeFrames(
  plan: ClipPlan,
  inspected: Inspected,
  overlays: Overlays,
  canvas: OffscreenCanvas,
  videoSource: CanvasSource,
  progress: (time: number) => void,
  signal: AbortSignal | undefined,
): Promise<void> {
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) {
    throw new ClipError('no-webcodecs', 'OffscreenCanvas has no 2D context here.')
  }
  const { start, end, crop, video } = plan
  const { info } = inspected
  const scaleX = canvas.width / crop.width
  const scaleY = canvas.height / crop.height
  let clipEnd = 0
  let frameDuration = 1 / 30
  for await (const sample of new VideoSampleSink(video).samples(start, end)) {
    try {
      if (signal?.aborted) {
        break
      }
      const from = Math.max(start, sample.timestamp)
      const to = Math.min(end, sample.timestamp + sample.duration)
      if (to <= from) {
        continue
      }
      // Drawn at the reference track's size, so a smaller variant fills the same crop window.
      sample.draw(ctx, -crop.left * scaleX, -crop.top * scaleY, info.width * scaleX, info.height * scaleY)
      overlays.paint(ctx, from)
      await videoSource.add(from - start, to - from)
      clipEnd = to - start
      if (sample.duration > 1 / 120 && sample.duration < 1 / 10) {
        frameDuration = sample.duration
      }
      progress(clipEnd)
    } finally {
      sample.close()
    }
  }

  const { card, lastFrame } = overlays
  if (card && !signal?.aborted) {
    ;(lastFrame.getContext('2d') as Context).drawImage(canvas, 0, 0)
    for (let time = 0; time < card.duration - 1e-6 && !signal?.aborted; time += frameDuration) {
      card.draw(ctx, time)
      await videoSource.add(clipEnd + time, Math.min(frameDuration, card.duration - time))
      progress(clipEnd + time)
    }
  }
  if (signal?.aborted) {
    throw abortReason(signal)
  }
  videoSource.close()
}

/**
 * Cuts `[start, end)` out of a video, crops it, burns captions (plus watermark and stamp) into the
 * picture, optionally adds an end card, and resolves with an MP4 (H.264 + AAC). Everything runs on the
 * device: Mediabunny demuxes, WebCodecs decodes, reel draws each frame onto one reused canvas and a
 * `CanvasSource` encodes it with backpressure; audio is a composable `Conversion` into the same output
 * (AAC copied, anything else encoded as AAC). A logo, caption file or audio codec that cannot be used is
 * left out with an `onWarning` (see `ClipWarning`), never failing the clip; an unknown `captions.track`
 * id rejects with a `RangeError`. Rejects with a {@link ClipError} for the blockers `canClip` reports,
 * and with `signal.reason` when aborted.
 */
export async function createClip(options: ClipOptions): Promise<Blob> {
  const { signal } = options
  const checkAborted = () => {
    if (signal?.aborted) throw abortReason(signal)
  }
  checkAborted()

  const inspected = await inspect(options.source, options.cache)
  const images = createImageCache()
  const warn: Warn = (warning) => (options.onWarning ? options.onWarning(warning) : console.warn(warning.message))
  let opened: ClipOutput | undefined
  const running: Promise<unknown>[] = []
  const onAbort = () => void opened?.conversion?.cancel()
  signal?.addEventListener('abort', onAbort)

  try {
    const plan = await planClip(options, inspected, warn)
    checkAborted()
    const canvas = new OffscreenCanvas(plan.crop.outputWidth, plan.crop.outputHeight)
    const overlays = await prepareOverlays(options, inspected, plan, images, warn)
    checkAborted()
    opened = await openOutput(options, inspected, plan, canvas)
    checkAborted()
    await opened.output.start()

    const total = plan.end - plan.start + (overlays.card?.duration ?? 0)
    let reported = 0
    const progress = (time: number) => {
      const fraction = Math.min(0.999, time / total)
      if (options.onProgress && fraction > reported) {
        reported = fraction
        options.onProgress(fraction)
      }
    }

    running.push(encodeFrames(plan, inspected, overlays, canvas, opened.videoSource, progress, signal))
    if (opened.conversion) {
      running.push(opened.conversion.execute())
    }
    await Promise.all(running)
    await opened.output.finalize()
    // An abort that lands while the file is being finalised still rejects: the caller asked for no
    // clip and waits to hear so (the picker's cancel does).
    checkAborted()

    const buffer = (opened.output.target as BufferTarget).buffer
    if (!buffer) {
      throw new Error('reel: the output was finalised without data.')
    }
    options.onProgress?.(1)
    return new Blob([buffer], { type: 'video/mp4' })
  } catch (error) {
    // Stop whatever is still running and wait for it to settle before the input is disposed, so no
    // pump is left reading a closed source. Cancelling surfaces as ConversionCanceledError or as the
    // output's own "has been canceled" error depending on where the pipeline was; after an abort,
    // either is just the abort.
    const { conversion, output } = opened ?? {}
    if (conversion && (conversion.state === 'executing' || conversion.state === 'idle')) {
      await conversion.cancel()
    }
    if (output && output.state !== 'canceled' && output.state !== 'finalized') {
      await output.cancel()
    }
    await Promise.allSettled(running)
    checkAborted()
    throw error
  } finally {
    signal?.removeEventListener('abort', onAbort)
    await images.dispose()
    inspected.input.dispose()
  }
}
