import { afterEach, describe, expect, inject, it, vi } from 'vite-plus/test'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { createSplice } from '@/index'
import { changedFraction, pixelsAt } from '@test/browser/helpers'

const server = inject('logoServer')

const english = 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nEnglish words on screen\n'
const french = 'WEBVTT\r\n\r\n00:00:00.000 --> 00:00:02.000\r\n<i>Des mots français</i>\r\n'
const subRip = '1\r\n00:00:00,000 --> 00:00:02,000\r\nDes mots français\r\n'
const crop = { aspect: '16:9', height: 540 } as const

let objectUrls: string[] = []
afterEach(() => {
  objectUrls.forEach((url) => URL.revokeObjectURL(url))
  objectUrls = []
})

/** A same-origin URL for caption text, as a page would serve a `.vtt` file. */
function createFileUrl(text: string, type = 'text/vtt'): string {
  const url = URL.createObjectURL(new Blob([text], { type }))
  objectUrls.push(url)
  return url
}

async function flower(): Promise<Blob> {
  return (await fetch(flowerUrl)).blob()
}

/** How much of the caption band, near the bottom, differs between two clips half a second in. */
async function readCaptionBand(a: Blob, b: Blob): Promise<number> {
  const [first, second] = await Promise.all([pixelsAt(a, 0.5), pixelsAt(b, 0.5)])
  return changedFraction(first, second, Math.round(first.height * 0.6), Math.round(first.height * 0.9))
}

describe('captions by URL', () => {
  it('fetches WebVTT from a URL or a URL object and burns it in, and reads WebVTT text', async () => {
    const source = await flower()
    // One at a time and small: five exports at once overwhelm WebKit's shared hardware encoder.
    const clip = (captions?: string | URL) => createSplice({ source, start: 0, end: 1, crop, captions })
    const plain = await clip()
    const byUrl = await clip(createFileUrl(english))
    const byUrlObject = await clip(new URL(createFileUrl(french)))
    const crossOrigin = await clip(`${server}/captions-cors.vtt`)
    const asText = await clip(english)

    expect(await readCaptionBand(plain, byUrl)).toBeGreaterThan(0.01)
    expect(await readCaptionBand(plain, byUrlObject)).toBeGreaterThan(0.01)
    expect(await readCaptionBand(plain, crossOrigin)).toBeGreaterThan(0.01)
    expect(await readCaptionBand(byUrl, byUrlObject)).toBeGreaterThan(0.005)
    expect(await readCaptionBand(byUrl, asText)).toBeLessThan(0.002)
  })

  it('makes the clip without captions, and warns, for a file served without CORS, not found, or not WebVTT', async () => {
    const source = await flower()
    const plain = await createSplice({ source, start: 0, end: 1, crop })
    const cases = [
      { captions: `${server}/captions.vtt`, says: 'Access-Control-Allow-Origin' },
      { captions: `${server}/missing-cors.vtt`, says: '404' },
      { captions: createFileUrl('<!doctype html><title>Not found</title><p>Nothing here.</p>', 'text/html'), says: 'is not WebVTT' },
      // SubRip isn't read: convert SRT to WebVTT first.
      { captions: createFileUrl(subRip, 'application/x-subrip'), says: 'is not WebVTT' },
    ]

    for (const { captions, says } of cases) {
      const warnings: string[] = []
      const clip = await createSplice({ source, start: 0, end: 1, crop, captions, onWarning: (message) => warnings.push(message) })
      expect(clip.size, says).toBeGreaterThan(0)
      expect(warnings, says).toEqual([expect.stringContaining(says)])
      expect(await readCaptionBand(plain, clip), says).toBeLessThan(0.002)
    }
  })

  it('warns through console.warn without an onWarning handler', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const clip = await createSplice({ source: await flower(), start: 0, end: 1, captions: `${server}/missing-cors.vtt` })
    expect(clip.size).toBeGreaterThan(0)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('The captions are left out'))
    warn.mockRestore()
  })

  it('rejects with the signal’s reason when aborted while fetching captions', async () => {
    const controller = new AbortController()
    const reason = new DOMException('stop', 'AbortError')
    const clip = createSplice({ source: flowerUrl, start: 0, end: 1, captions: `${server}/captions-cors.vtt`, signal: controller.signal })
    controller.abort(reason)
    await expect(clip).rejects.toBe(reason)
  })
})
