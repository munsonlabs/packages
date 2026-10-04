import { afterEach, describe, expect, inject, it, vi } from 'vite-plus/test'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import masterUrl from '@test/browser/media/ladder/master.m3u8?url'
import { createClip, listCaptionTracks, loadCaptions, loadCaptionTrack, type ClipWarning } from '@/index'
import { changedFraction, pixelsAt } from '@test/browser/helpers'

const server = inject('logoServer')
const master = new URL(masterUrl, location.href).href

const english = 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nEnglish words on screen\n'
const french = 'WEBVTT\r\n\r\n00:00:00.000 --> 00:00:02.000\r\n<i>Des mots français</i>\r\n'
const subRip = '1\r\n00:00:00,000 --> 00:00:02,000\r\nDes mots français\r\n'

let objectUrls: string[] = []
afterEach(() => {
  objectUrls.forEach((url) => URL.revokeObjectURL(url))
  objectUrls = []
})

/** A same-origin URL for caption text, as a page would serve a `.vtt` file. */
function file(text: string, type = 'text/vtt'): string {
  const url = URL.createObjectURL(new Blob([text], { type }))
  objectUrls.push(url)
  return url
}

async function flower(): Promise<Blob> {
  return (await fetch(flowerUrl)).blob()
}

/** How much of the caption band (above the 14% bottom margin) differs between two clips, 0.5s in. */
async function captionBand(a: Blob, b: Blob): Promise<number> {
  const [first, second] = await Promise.all([pixelsAt(a, 0.5), pixelsAt(b, 0.5)])
  return changedFraction(first, second, Math.round(first.height * 0.6), Math.round(first.height * 0.9))
}

describe('captions by URL', () => {
  it('fetches WebVTT from a URL or a URL object and burns it in', async () => {
    const source = await flower()
    const [plain, vtt, frenchClip, crossOrigin] = await Promise.all([
      createClip({ source, start: 0, end: 1 }),
      createClip({ source, start: 0, end: 1, captions: { cues: file(english) } }),
      createClip({ source, start: 0, end: 1, captions: { cues: new URL(file(french)) } }),
      createClip({ source, start: 0, end: 1, captions: { cues: `${server}/captions-cors.vtt` } }),
    ])
    expect(await captionBand(plain, vtt)).toBeGreaterThan(0.01)
    expect(await captionBand(plain, frenchClip)).toBeGreaterThan(0.01)
    expect(await captionBand(plain, crossOrigin)).toBeGreaterThan(0.01)
    expect(await captionBand(vtt, frenchClip)).toBeGreaterThan(0.005)
  })

  it('makes the clip without captions, and warns, for a file served without CORS, not found, or not WebVTT', async () => {
    const source = await flower()
    const plain = await createClip({ source, start: 0, end: 1 })
    const cases = [
      { cues: `${server}/captions.vtt`, says: 'Access-Control-Allow-Origin' },
      { cues: `${server}/missing-cors.vtt`, says: '404' },
      { cues: file('<!doctype html><title>Not found</title><p>Nothing here.</p>', 'text/html'), says: 'is not WebVTT' },
      // SubRip is not read: convert SRT to WebVTT first.
      { cues: file(subRip, 'application/x-subrip'), says: 'is not WebVTT' },
    ]
    for (const { cues, says } of cases) {
      const warnings: ClipWarning[] = []
      const clip = await createClip({ source, start: 0, end: 1, captions: { cues }, onWarning: (warning) => warnings.push(warning) })
      expect(clip.size, says).toBeGreaterThan(0)
      expect(warnings, says).toEqual([{ reason: 'captions-unavailable', target: 'captions', message: expect.stringContaining(says) }])
      expect(await captionBand(plain, clip), says).toBeLessThan(0.002)
    }
  })

  it('warns through console.warn without an onWarning handler', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const clip = await createClip({ source: await flower(), start: 0, end: 1, captions: { cues: `${server}/missing-cors.vtt` } })
      expect(clip.size).toBeGreaterThan(0)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('the captions are left out'))
    } finally {
      warn.mockRestore()
    }
  })

  it('still rejects when loadCaptions is called directly on a file that will not load', async () => {
    await expect(loadCaptions(`${server}/missing-cors.vtt`)).rejects.toThrow('404')
    await expect(loadCaptions(file('{"not":"captions"}', 'application/json'))).rejects.toThrow('is not WebVTT')
  })

  it('rejects with the signal’s reason when aborted while fetching captions', async () => {
    const controller = new AbortController()
    const reason = new DOMException('stop', 'AbortError')
    const clip = createClip({ source: flowerUrl, start: 0, end: 1, captions: { cues: `${server}/captions-cors.vtt` }, signal: controller.signal })
    controller.abort(reason)
    await expect(clip).rejects.toBe(reason)
  })
})

describe('several caption tracks', () => {
  const tracks = () => [
    { src: file(english), srclang: 'en', label: 'English' },
    { src: french, srclang: 'fr', label: 'Français' },
  ]

  it('lists passed tracks first, beside the stream’s own, and loads each by id', async () => {
    const passed = tracks()
    const list = await listCaptionTracks(master, { tracks: passed })
    expect(list.map((track) => `${track.id} ${track.label}${track.default ? ' (default)' : ''}`)).toEqual([
      'passed:0 English (default)',
      'passed:1 Français',
      'hls:0 English (default)',
      'hls:1 Français',
    ])
    expect(await loadCaptionTrack(master, 'passed:1', { tracks: passed })).toEqual([{ start: 0, end: 2, text: 'Des mots français' }])
    expect(await loadCaptionTrack(master, 'passed:0', { tracks: passed, start: 3 })).toEqual([])
    await expect(loadCaptionTrack(master, 'passed:2', { tracks: passed })).rejects.toBeInstanceOf(RangeError)
  })

  it('burns in the default track, or the one asked for', async () => {
    const source = await flower()
    const passed = tracks()
    const [byDefault, english, frenchClip, marked] = await Promise.all([
      createClip({ source, start: 0, end: 1, captions: { tracks: passed } }),
      createClip({ source, start: 0, end: 1, captions: { tracks: passed, track: 'passed:0' } }),
      createClip({ source, start: 0, end: 1, captions: { tracks: passed, track: 'passed:1' } }),
      createClip({ source, start: 0, end: 1, captions: { tracks: [passed[0], { ...passed[1], default: true }] } }),
    ])
    // Playwright's browsers run in en-US, so English is the default without a `default` flag.
    expect(await captionBand(byDefault, english)).toBeLessThan(0.002)
    expect(await captionBand(english, frenchClip)).toBeGreaterThan(0.005)
    expect(await captionBand(marked, frenchClip)).toBeLessThan(0.002)
  })
})
