import { CanvasSink, EncodedPacketSink } from 'mediabunny'
import { openSource, selectTracks } from './source'
import { runScoped } from '@/utils/scope'
import { makeEven } from '@/utils/size'
import type { ThumbnailOptions } from '@/types/splice'

/**
 * Makes evenly spaced thumbnails for a filmstrip, passing each to onThumbnail as it's ready. Each
 * one is the nearest keyframe at or before its time, and thumbnails that share a keyframe share one
 * decode, so nothing past a keyframe ever gets decoded.
 */
export function createThumbnails(options: ThumbnailOptions): Promise<void> {
  const { signal, onThumbnail } = options

  return runScoped(async (scope) => {
    const source = await openSource(options.source)
    const { input, info } = source
    const dispose = () => input.dispose()
    signal?.addEventListener('abort', dispose, { once: true })
    scope.always(() => signal?.removeEventListener('abort', dispose))
    scope.always(dispose)

    const from = Math.max(0, options.start ?? 0)
    const to = Math.min(info.duration, options.end ?? info.duration)
    const count = options.count ?? 10
    const width = makeEven(options.width ?? 160)
    const height = makeEven((width * info.height) / info.width)
    const { video } = await selectTracks(source, { width, height })
    const times = Array.from({ length: count }, (_, index) => from + (index * (to - from)) / count)

    const packets = new EncodedPacketSink(video)
    const firstTimestamp = await video.getFirstTimestamp()
    const keyTimes: number[] = []
    for (const time of times) {
      const key =
        (await packets.getKeyPacket(firstTimestamp + time, { metadataOnly: true })) ?? (await packets.getFirstKeyPacket({ metadataOnly: true }))
      keyTimes.push(key?.timestamp ?? firstTimestamp + time)
    }
    const targets = [...new Set(keyTimes)]

    const sink = new CanvasSink(video, { width, height, fit: 'cover', poolSize: 2 })
    const canvases = sink.canvasesAtTimestamps(targets)
    let target = 0

    for await (const wrapped of canvases) {
      signal?.throwIfAborted()
      const keyTime = targets[target++]
      if (!wrapped) continue

      keyTimes.forEach((time, index) => {
        if (time === keyTime) onThumbnail(index, wrapped.canvas, times[index])
      })
    }
  }, signal)
}
