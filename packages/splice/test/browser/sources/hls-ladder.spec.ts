import { afterEach, describe, expect, it } from 'vite-plus/test'
import masterUrl from '@test/browser/media/ladder/master.m3u8?url'
import { canSplice, createSplice, createThumbnails } from '@/index'
import { engine, probe, trackFrames } from '@test/browser/helpers'

/**
 * The ladder fixture is an HLS master with a 320x180 and a 1280x720 variant of the same 4 seconds
 * (1s MPEG-TS segments, a keyframe every second, media starting at PTS 10s).
 */
const master = new URL(masterUrl, location.href).href

/** Records every URL fetched while installed: Mediabunny fetches through `globalThis.fetch`. */
function recordFetches() {
  const original = globalThis.fetch
  const urls: string[] = []
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    urls.push(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    return original(input, init)
  }
  return {
    urls,
    matching: (pattern: RegExp) => urls.filter((url) => pattern.test(url)),
    restore: () => {
      globalThis.fetch = original
    },
  }
}

/** Counts frames that `VideoDecoder`s emit while installed: one per decoded picture. */
function countDecodes() {
  const Decoder = globalThis.VideoDecoder
  let frames = 0
  globalThis.VideoDecoder = new Proxy(Decoder, {
    construct(target, [init], newTarget) {
      const output = (frame: VideoFrame) => {
        frames++
        init.output(frame)
      }
      return Reflect.construct(target, [{ ...init, output }], newTarget)
    },
  })
  return {
    get frames() {
      return frames
    },
    restore: () => {
      globalThis.VideoDecoder = Decoder
    },
  }
}

let restore: Array<() => void> = []
afterEach(() => {
  restore.forEach((undo) => undo())
  restore = []
})

function watchFetches() {
  const log = recordFetches()
  restore.push(log.restore)
  return log
}

describe('HLS variants', () => {
  it('checks a master playlist from its playlists alone, describing the largest variant', async () => {
    const log = watchFetches()
    const result = await canSplice(master)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.info).toMatchObject({ width: 1280, height: 720 })
    expect(result.info.duration).toBeGreaterThan(3.9)
    expect(log.matching(/\.m2ts$/), 'media segments read by canSplice').toEqual([])
  })

  it('makes thumbnails from the small variant without touching the large one', async () => {
    const log = watchFetches()
    const frames = trackFrames()
    restore.push(frames.restore)
    const thumbnails: number[] = []

    await createThumbnails({ source: master, end: 4, count: 4, width: 96, onThumbnail: (index) => thumbnails.push(index) })

    expect(frames.open, 'VideoFrames left open').toBe(0)
    expect(thumbnails).toEqual([0, 1, 2, 3])
    expect(log.matching(/\/small\/seg\d\.m2ts$/).length).toBeGreaterThan(0)
    expect(log.matching(/\/large\/seg\d\.m2ts$/), 'large media segments').toEqual([])
    console.log(`SPLICE_HLS_LADDER ${engine()} thumbnail requests ${log.urls.length}`)
  })

  it('decodes each keyframe once for thumbnails that share it', async () => {
    const decodes = countDecodes()
    restore.push(decodes.restore)
    const thumbnails: number[] = []

    // Eight thumbnails over two seconds of a stream with a keyframe every second: two decodes.
    await createThumbnails({ source: master, end: 2, count: 8, width: 96, onThumbnail: (index) => thumbnails.push(index) })

    expect(thumbnails).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(decodes.frames).toBe(2)
  })

  it('stops thumbnails when the signal aborts, with the signal’s reason', async () => {
    const controller = new AbortController()
    const reason = new DOMException('closed', 'AbortError')
    const frames = trackFrames()
    restore.push(frames.restore)

    const promise = createThumbnails({
      source: master,
      end: 4,
      count: 8,
      width: 96,
      onThumbnail: () => controller.abort(reason),
      signal: controller.signal,
    })
    await expect(promise).rejects.toBe(reason)
    expect(frames.open, 'VideoFrames left open').toBe(0)
  })

  it('exports from the smallest variant that covers the output, with that variant’s audio', async () => {
    let log = watchFetches()
    const small = await createSplice({ source: master, start: 1, end: 3, crop: { aspect: '9:16', height: 180 } })
    expect(log.matching(/\/small\/seg\d\.m2ts$/).length).toBeGreaterThan(0)
    expect(log.matching(/\/large\/seg\d\.m2ts$/), 'large segments for a 180p clip').toEqual([])
    const probedSmall = await probe(small)
    expect(probedSmall.video).toMatchObject({ height: 180 })
    expect(probedSmall.audio).not.toBeNull()
    expect(Math.abs(probedSmall.duration - 2)).toBeLessThan(0.15)
    log.restore()

    log = watchFetches()
    const large = await createSplice({ source: master, start: 1, end: 3, crop: { aspect: '9:16', height: 320 } })
    expect(log.matching(/\/large\/seg\d\.m2ts$/).length).toBeGreaterThan(0)
    expect(log.matching(/\/small\/seg\d\.m2ts$/), 'small segments for a 320p clip').toEqual([])
    expect((await probe(large)).video).toMatchObject({ height: 320 })
  })
})
