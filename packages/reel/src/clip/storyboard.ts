import { CanvasSink, EncodedPacketSink } from 'mediabunny'
import { even } from '@/clip/crop'
import { inspect } from '@/clip/support'
import type { Storyboard, StoryboardOptions } from '@/types'

/** Formats seconds as a WebVTT timestamp, `hh:mm:ss.ttt`. */
export function vttTimestamp(seconds: number): string {
  const totalMillis = Math.round(seconds * 1000)
  const hours = Math.floor(totalMillis / 3_600_000)
  const minutes = Math.floor((totalMillis % 3_600_000) / 60_000)
  const secs = Math.floor((totalMillis % 60_000) / 1000)
  const millis = totalMillis % 1000
  const pad = (value: number, width = 2) => String(value).padStart(width, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(millis, 3)}`
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('The storyboard was aborted.', 'AbortError')
}

/**
 * Builds a scrubber storyboard: one JPEG sprite of evenly spaced thumbnails and a WebVTT file whose
 * cues point into it with `#xywh=`, the format players (video-player's scrubber preview included) read
 * for hover previews.
 *
 * It reads as little as it can. By default each thumbnail is the nearest keyframe at or before its
 * time: the keyframes are looked up first, thumbnails sharing one are decoded once, and no frame after
 * a keyframe is decoded (`exact: true` decodes to the exact time instead). Frames come from
 * Mediabunny's `CanvasSink`, which closes every frame itself; this function only ever holds canvases.
 * `onTile` sees each thumbnail as it lands; aborting `signal` disposes the input, cancelling any
 * download in flight.
 */
export async function createStoryboard(options: StoryboardOptions): Promise<Storyboard> {
  const { signal } = options
  signal?.throwIfAborted()
  const { input, video, info } = await inspect(options.source)
  const onAbort = () => input.dispose()
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    signal?.throwIfAborted()
    const from = Math.max(0, options.start ?? 0)
    const to = Math.min(info.duration, options.end ?? info.duration)
    const interval = options.interval ?? Math.max(1, Math.ceil((to - from) / 100))
    const tileWidth = even(options.tileWidth ?? 160)
    const tileHeight = even((tileWidth * info.height) / info.width)
    const columns = options.columns ?? 10
    const firstTimestamp = await video.getFirstTimestamp()
    const starts: number[] = []
    for (let t = from; t < to; t += interval) {
      starts.push(t)
    }
    const rows = Math.ceil(starts.length / columns)

    const sprite = new OffscreenCanvas(tileWidth * Math.min(columns, starts.length), tileHeight * rows)
    const ctx = sprite.getContext('2d')
    if (!ctx) {
      throw new Error('reel: OffscreenCanvas has no 2D context here.')
    }
    const imageUrl = options.imageUrl ?? 'storyboard.jpg'
    const lines = ['WEBVTT', '']
    const place = (index: number) => ({ x: (index % columns) * tileWidth, y: Math.floor(index / columns) * tileHeight })
    starts.forEach((cueStart, index) => {
      const { x, y } = place(index)
      const cueEnd = Math.min(to, cueStart + interval)
      lines.push(`${vttTimestamp(cueStart)} --> ${vttTimestamp(cueEnd)}`, `${imageUrl}#xywh=${x},${y},${tileWidth},${tileHeight}`, '')
    })

    // Each decode target and the tiles it fills. Targets are produced lazily, so the first keyframe
    // is decoding while the later ones are still being looked up.
    const groups: number[][] = []
    const packets = new EncodedPacketSink(video)
    const exact = options.exact === true
    async function* targets(): AsyncGenerator<number> {
      let last: number | null = null
      for (const [index, start] of starts.entries()) {
        signal?.throwIfAborted()
        let time = firstTimestamp + start
        if (!exact) {
          const key = (await packets.getKeyPacket(time, { metadataOnly: true })) ?? (await packets.getFirstKeyPacket({ metadataOnly: true }))
          time = key ? key.timestamp : time
        }
        if (last !== null && Math.abs(time - last) < 1e-6) {
          groups[groups.length - 1].push(index)
          continue
        }
        last = time
        groups.push([index])
        yield time
      }
    }

    const sink = new CanvasSink(video, { width: tileWidth, height: tileHeight, fit: 'cover', poolSize: 2 })
    let group = 0
    for await (const wrapped of sink.canvasesAtTimestamps(targets())) {
      signal?.throwIfAborted()
      for (const index of groups[group] ?? []) {
        if (wrapped) {
          const { x, y } = place(index)
          ctx.drawImage(wrapped.canvas, x, y, tileWidth, tileHeight)
          options.onTile?.(index, wrapped.canvas, starts[index])
        }
      }
      group++
    }
    signal?.throwIfAborted()

    const image = await sprite.convertToBlob({ type: 'image/jpeg', quality: 0.75 })
    return { image, vtt: lines.join('\n'), tileWidth, tileHeight, count: starts.length }
  } catch (error) {
    if (signal?.aborted) {
      throw abortReason(signal)
    }
    throw error
  } finally {
    signal?.removeEventListener('abort', onAbort)
    input.dispose()
  }
}
