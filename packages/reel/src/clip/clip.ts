import { BufferTarget, CanvasSource, Conversion, Mp4OutputFormat, Output, QUALITY_HIGH, VideoSampleSink, type MetadataTags } from 'mediabunny'
import { activeCues, defaultTrackIndex } from '@/captions/cues'
import { loadCaptions } from '@/captions/fetch'
import { createCaptionPainter } from '@/render/captions'
import { planCrop } from '@/clip/crop'
import { originTags } from '@/clip/origin'
import { ClipError } from '@/utils/errors'
import { audioRequest, inspect, noVideoEncoder, planOutput } from '@/clip/support'
import type { CaptionCue, ClipOptions, ClipWarning } from '@/types'

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('The clip was aborted.', 'AbortError')
}

/**
 * The cues a clip burns in: those passed (cues, WebVTT text, a `TextTrack`, or a WebVTT file's URL to
 * fetch), else the default passed track's.
 */
async function clipCues(options: ClipOptions): Promise<CaptionCue[]> {
  const captions = options.captions
  if (!captions) {
    return []
  }
  if (captions.cues !== undefined) {
    return loadCaptions(captions.cues, { signal: options.signal })
  }
  const passed = captions.tracks ?? []
  if (passed.length > 0) {
    return loadCaptions(passed[defaultTrackIndex(passed)].src, { signal: options.signal })
  }
  return []
}

/**
 * Cuts `[start, end)` out of a video, crops it to an aspect ratio, burns captions into the picture,
 * and resolves with the encoded file: always an MP4 (`video/mp4`) with H.264 video and AAC audio.
 *
 * Everything happens on the device. Mediabunny demuxes the source (reading only the byte ranges it
 * needs from a URL) and WebCodecs decodes each frame; reel draws it cropped onto one reused
 * `OffscreenCanvas`, paints captions over it and hands the canvas to a `CanvasSource`, which encodes
 * it with backpressure. Audio runs beside
 * it as a composable Mediabunny `Conversion` into the same output: AAC is copied without re-encoding,
 * other audio encoded as AAC. Every decoded sample is closed as soon as it is drawn.
 *
 * Captions are loaded before encoding starts; a caption file that cannot be fetched or read leaves
 * the clip without captions and is reported through `onWarning` (or `console.warn`) as
 * `'captions-unavailable'` rather than failing the clip. Audio that is not AAC, in a browser without an
 * AAC encoder (Firefox), is left out too: the clip is silent and `onWarning` gets `'audio-unavailable'`.
 *
 * Rejects with a {@link ClipError} when the source cannot be clipped (the same reasons `canClip`
 * reports), and with `signal.reason` when aborted.
 */
export async function createClip(options: ClipOptions): Promise<Blob> {
  const { signal } = options
  if (signal?.aborted) {
    throw abortReason(signal)
  }

  const { input, video, audio, info } = await inspect(options.source)
  let conversion: Conversion | undefined
  let output: Output | undefined
  const warn = (warning: ClipWarning) => {
    if (options.onWarning) {
      options.onWarning(warning)
    } else {
      console.warn(warning.message)
    }
  }
  const running: Promise<unknown>[] = []
  const onAbort = () => {
    void conversion?.cancel()
  }
  signal?.addEventListener('abort', onAbort)

  try {
    const start = Math.max(0, options.start ?? 0)
    const end = Math.min(info.duration, options.end ?? info.duration)
    if (!(end > start)) {
      throw new RangeError(`reel: end (${end}) must be after start (${start}) and within the source (${info.duration}s).`)
    }

    const crop = planCrop(info.width, info.height, options.crop)
    const sound = await audioRequest(audio)
    const plan = await planOutput({ width: crop.outputWidth, height: crop.outputHeight, ...sound, audio: options.audio })
    if (!plan) {
      throw noVideoEncoder(crop.outputWidth, crop.outputHeight)
    }
    if (plan.audio === 'unavailable') {
      warn({
        reason: 'audio-unavailable',
        target: 'audio',
        message: `reel: the audio is left out. Clips are MP4 with AAC audio, and this browser has no AAC encoder for the source's ${sound.sourceAudio} audio.`,
      })
    }
    if (signal?.aborted) {
      throw abortReason(signal)
    }

    const { outputWidth: width, outputHeight: height } = crop
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) {
      throw new ClipError('no-webcodecs', 'OffscreenCanvas has no 2D context here.')
    }
    let cues: CaptionCue[] = []
    try {
      cues = await clipCues(options)
    } catch (error) {
      if (signal?.aborted) {
        throw error
      }
      const detail = (error instanceof Error ? error.message : String(error)).replace(/^reel: /, '')
      warn({ reason: 'captions-unavailable', target: 'captions', message: `reel: the captions are left out. ${detail}` })
    }
    const paintCaptions = createCaptionPainter(width, height, options.captions?.style)

    const scaleX = width / crop.width
    const scaleY = height / crop.height
    const total = end - start

    // Source tags are never carried over: they can hold things (location, device, a different
    // title) that do not describe the clip. With an origin, the clip says where it came from.
    const writeOrigin = options.origin !== undefined && options.metadata !== false
    const tags: MetadataTags = writeOrigin && options.origin ? originTags(options.origin, start, end) : {}

    output = new Output({
      format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: new BufferTarget(),
    })
    const videoSource = new CanvasSource(canvas, { codec: 'avc', quality: QUALITY_HIGH })
    output.addVideoTrack(videoSource)

    if ((plan.audio === 'copy' || plan.audio === 'encode') && audio) {
      // AAC is copied packet for packet; anything else is decoded and encoded as AAC.
      conversion = await Conversion.init({
        input,
        output,
        composable: true,
        tracks: 'primary',
        trim: { start, end },
        video: { discard: true },
        audio: { codec: 'aac' },
        showWarnings: false,
      })
    }
    output.setMetadataTags(tags)
    if (signal?.aborted) {
      throw abortReason(signal)
    }
    await output.start()

    const report = options.onProgress
    let reported = 0
    const progress = (time: number) => {
      const fraction = Math.min(0.999, time / total)
      if (report && fraction > reported) {
        reported = fraction
        report(fraction)
      }
    }

    /**
     * Draws every frame of the clip into the canvas and encodes it. The crop is
     * done by drawing the whole frame scaled and shifted so the canvas edges cut it, not with a source
     * rectangle: WebKit's `drawImage(VideoFrame, sx, sy, sw, sh, ...)` ignores the source rectangle
     * and draws the full frame (verified in WebKit 26.5), which is also why Mediabunny's own `crop`
     * option gives uncropped, squashed video in Safari. `sample.draw` applies the track's rotation, so
     * a phone video arrives upright.
     */
    const pumpVideo = async () => {
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
          sample.draw(ctx, -crop.left * scaleX, -crop.top * scaleY, info.width * scaleX, info.height * scaleY)
          if (cues.length > 0) {
            paintCaptions(ctx, activeCues(cues, from))
          }
          await videoSource.add(from - start, to - from)
          progress(to - start)
        } finally {
          sample.close()
        }
      }
      if (signal?.aborted) {
        throw abortReason(signal)
      }
      videoSource.close()
    }

    const videoRun = pumpVideo()
    running.push(videoRun)
    if (conversion) {
      running.push(conversion.execute())
    }
    await Promise.all(running)
    await output.finalize()
    // An abort that lands while the file is being finalised still rejects: the caller asked for no
    // clip and waits to hear so.
    if (signal?.aborted) {
      throw abortReason(signal)
    }

    const buffer = (output.target as BufferTarget).buffer
    if (!buffer) {
      throw new Error('reel: the output was finalised without data.')
    }
    report?.(1)
    return new Blob([buffer], { type: 'video/mp4' })
  } catch (error) {
    // Stop whatever is still running and wait for it to settle before the input is disposed, so no
    // pump is left reading a closed source. Cancelling surfaces as ConversionCanceledError or as the
    // output's own "has been canceled" error depending on where the pipeline was; after an abort,
    // either is just the abort.
    if (conversion && (conversion.state === 'executing' || conversion.state === 'idle')) {
      await conversion.cancel()
    }
    if (output && output.state !== 'canceled' && output.state !== 'finalized') {
      await output.cancel()
    }
    await Promise.allSettled(running)
    if (signal?.aborted) {
      throw abortReason(signal)
    }
    throw error
  } finally {
    signal?.removeEventListener('abort', onAbort)
    input.dispose()
  }
}
