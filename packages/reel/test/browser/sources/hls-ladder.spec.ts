import { afterEach, describe, expect, it } from 'vite-plus/test'
import masterUrl from '@test/browser/media/ladder/master.m3u8?url'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { canClip, createClip, createStoryboard, listCaptionTracks, loadCaptionTrack, type ClipWarning } from '@/index'
import { changedFraction, engine, pixelsAt, probe, trackFrames } from '@test/browser/helpers'

/**
 * The ladder fixture is an HLS master with a 320x180 and a 1280x720 variant of the same 4 seconds
 * (1s MPEG-TS segments, keyframe every second, media starting at PTS 10s) and English and French
 * subtitles as segmented WebVTT with X-TIMESTAMP-MAP=MPEGTS:945000 (cue time 0 is clip time 0.5).
 */
const master = new URL(masterUrl, location.href).href

/** Records every URL fetched while installed (Mediabunny and reel both fetch through `globalThis.fetch`). */
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

function fetches() {
  const log = recordFetches()
  restore.push(log.restore)
  return log
}

describe('HLS variants', () => {
  it('checks a master playlist from its playlists alone, describing the largest variant', async () => {
    const log = fetches()
    const result = await canClip(master)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.info).toMatchObject({ width: 1280, height: 720 })
    expect(result.info.videoTracks.map(({ width, height }) => `${width}x${height}`)).toEqual(['1280x720', '320x180'])
    expect(result.info.duration).toBeGreaterThan(3.9)
    expect(log.matching(/\.m2ts$/), 'media segments read by canClip').toEqual([])
  })

  it('builds the storyboard from the small variant without touching the large one', async () => {
    const log = fetches()
    const frames = trackFrames()
    try {
      const tiles: number[] = []
      const board = await createStoryboard({ source: master, end: 4, interval: 1, tileWidth: 96, columns: 4, onTile: (index) => tiles.push(index) })
      expect(frames.open, 'VideoFrames left open').toBe(0)
      expect(board.count).toBe(4)
      expect([board.tileWidth, board.tileHeight]).toEqual([96, 54])
      expect(tiles).toEqual([0, 1, 2, 3])
      expect(log.matching(/\/small\/seg\d\.m2ts$/).length).toBeGreaterThan(0)
      expect(log.matching(/\/large\/seg\d\.m2ts$/), 'large media segments').toEqual([])
      console.log(`REEL_HLS_LADDER ${engine()} storyboard requests ${log.urls.length}: ${log.urls.map((url) => url.split('/ladder/')[1]).join(' ')}`)
    } finally {
      frames.restore()
    }
  })

  it('decodes each keyframe once for thumbnails that share it, and every exact frame on request', async () => {
    const decodes = countDecodes()
    restore.push(decodes.restore)
    // Eight thumbnails over two seconds of a stream with a keyframe every second: two decodes.
    const keyframes = await createStoryboard({ source: master, end: 2, interval: 0.25, tileWidth: 96, columns: 8 })
    expect(keyframes.count).toBe(8)
    const keyDecodes = decodes.frames
    expect(keyDecodes).toBe(2)

    const exact = await createStoryboard({ source: master, end: 2, interval: 0.25, tileWidth: 96, columns: 8, exact: true })
    expect(exact.count).toBe(8)
    expect(decodes.frames - keyDecodes).toBeGreaterThanOrEqual(8)
    const bitmap = await createImageBitmap(exact.image)
    expect([bitmap.width, bitmap.height]).toEqual([768, 54])
    bitmap.close()
  })

  it('stops a storyboard when its signal aborts, with the signal’s reason', async () => {
    const controller = new AbortController()
    const reason = new DOMException('closed', 'AbortError')
    const frames = trackFrames()
    try {
      const promise = createStoryboard({
        source: master,
        end: 4,
        interval: 0.5,
        tileWidth: 96,
        onTile: () => controller.abort(reason),
        signal: controller.signal,
      })
      await expect(promise).rejects.toBe(reason)
      expect(frames.open, 'VideoFrames left open').toBe(0)
    } finally {
      frames.restore()
    }
  })

  it('exports from the smallest variant that covers the output, with that variant’s audio', async () => {
    let log = fetches()
    const small = await createClip({ source: master, start: 1, end: 3, crop: { aspect: '9:16', height: 180 }, endCard: false })
    expect(log.matching(/\/small\/seg\d\.m2ts$/).length).toBeGreaterThan(0)
    expect(log.matching(/\/large\/seg\d\.m2ts$/), 'large segments for a 180p clip').toEqual([])
    const probedSmall = await probe(small)
    expect(probedSmall.video).toMatchObject({ height: 180 })
    expect(probedSmall.audio).not.toBeNull()
    expect(Math.abs(probedSmall.duration - 2)).toBeLessThan(0.15)
    log.restore()

    log = fetches()
    const large = await createClip({ source: master, start: 1, end: 3, crop: { aspect: '9:16', height: 320 }, endCard: false })
    expect(log.matching(/\/large\/seg\d\.m2ts$/).length).toBeGreaterThan(0)
    expect(log.matching(/\/small\/seg\d\.m2ts$/), 'small segments for a 320p clip').toEqual([])
    expect((await probe(large)).video).toMatchObject({ height: 320 })

    log.restore()
    log = fetches()
    await createClip({ source: master, start: 1, end: 2, crop: { aspect: '9:16', height: 180 }, track: 'largest', endCard: false })
    expect(log.matching(/\/small\/seg\d\.m2ts$/), 'track: largest').toEqual([])
  })
})

describe('HLS captions', () => {
  it('lists the subtitle renditions from the master playlist', async () => {
    expect(await listCaptionTracks(master)).toEqual([
      { id: 'hls:0', kind: 'hls', language: 'en', label: 'English', default: true },
      { id: 'hls:1', kind: 'hls', language: 'fr', label: 'Français', default: false },
    ])
    expect(await listCaptionTracks(flowerUrl)).toEqual([])
  })

  it('fetches only the overlapping WebVTT segments and lines cues up with X-TIMESTAMP-MAP', async () => {
    const log = fetches()
    const cues = await loadCaptionTrack(master, 'hls:1', { start: 1.6, end: 2.4 })
    expect(cues).toEqual([{ start: 1.5, end: 2.5, text: 'FR un' }])
    expect(log.matching(/\/subs\/.*\.vtt$/).map((url) => url.split('/subs/')[1])).toEqual(['fr-1.vtt', 'fr-2.vtt'])

    const all = await loadCaptionTrack(master, 'hls:0')
    expect(all.map((cue) => [cue.start, cue.end, cue.text])).toEqual([
      [0.5, 1.5, 'EN zero'],
      [1.5, 2.5, 'EN one'],
      [2.5, 3.5, 'EN two'],
      [3.5, 4, 'EN three'],
    ])
    await expect(loadCaptionTrack(master, 'hls:7')).rejects.toBeInstanceOf(RangeError)
  })

  it('burns an HLS rendition into the clip', async () => {
    const options = { source: master, start: 1, end: 3, crop: { aspect: '9:16' as const, height: 640 }, endCard: false, audio: false }
    const plain = await createClip(options)
    const captioned = await createClip({ ...options, captions: { track: 'hls:0' } })
    // 0.8s into the clip is 1.8s on the source: "EN one" is up.
    const [a, b] = await Promise.all([pixelsAt(plain, 0.8), pixelsAt(captioned, 0.8)])
    const changed = changedFraction(a, b, Math.round(a.height * 0.6), Math.round(a.height * 0.95))
    console.log(`REEL_HLS_LADDER ${engine()} caption pixels changed ${changed.toFixed(3)}`)
    expect(changed).toBeGreaterThan(0.01)
  })

  it('makes the clip without captions, and warns, when the rendition’s segments fail', async () => {
    const options = { source: master, start: 1, end: 3, crop: { aspect: '9:16' as const, height: 640 }, endCard: false, audio: false }
    const plain = await createClip(options)
    const original = globalThis.fetch
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      return /\/subs\/[^/]+\.vtt$/.test(url) ? Promise.resolve(new Response('missing', { status: 404 })) : original(input, init)
    }
    const warnings: ClipWarning[] = []
    try {
      const clip = await createClip({ ...options, captions: { track: 'hls:0' }, onWarning: (warning) => warnings.push(warning) })
      expect(warnings).toEqual([{ reason: 'captions-unavailable', target: 'captions', message: expect.stringContaining('404') }])
      const [a, b] = await Promise.all([pixelsAt(plain, 0.8), pixelsAt(clip, 0.8)])
      expect(changedFraction(a, b, Math.round(a.height * 0.6), Math.round(a.height * 0.95))).toBeLessThan(0.002)
    } finally {
      globalThis.fetch = original
    }
  })
})

describe('a <video>’s text tracks', () => {
  it('lists caption and subtitle tracks and reads a disabled one, restoring its mode', async () => {
    const video = document.createElement('video')
    video.src = flowerUrl
    const vtt = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello\n\n00:00:03.000 --> 00:00:04.000\nAgain\n'
    const element = document.createElement('track')
    element.kind = 'subtitles'
    element.srclang = 'de'
    element.label = 'Deutsch'
    element.src = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }))
    video.append(element)
    video.addTextTrack('metadata', 'chapters', 'en')
    document.body.append(video)
    try {
      expect(element.track.mode).toBe('disabled')
      const tracks = await listCaptionTracks(video)
      expect(tracks).toEqual([{ id: 'text:0', kind: 'text-track', language: 'de', label: 'Deutsch', default: false }])
      const cues = await loadCaptionTrack(video, 'text:0', { start: 0, end: 2.5 })
      expect(cues).toEqual([{ start: 1, end: 2, text: 'Hello' }])
      expect(element.track.mode).toBe('disabled')

      element.track.mode = 'showing'
      expect((await listCaptionTracks(video))[0].default).toBe(true)
      expect(await loadCaptionTrack(video, 'text:0')).toHaveLength(2)
      expect(element.track.mode).toBe('showing')
    } finally {
      URL.revokeObjectURL(element.src)
      video.remove()
    }
  })
})
