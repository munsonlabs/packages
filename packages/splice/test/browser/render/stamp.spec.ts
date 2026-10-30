import { describe, expect, inject, it } from 'vite-plus/test'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { createSplice } from '@/index'
import { STAMP_MARGINS, STAMP_SIZE } from '@/constants'
import type { StampPosition } from '@/types/splice'
import { colourAt, pixelsAt, trackFrames } from '@test/browser/helpers'

const origin = { url: 'https://example.com/watch/flower', title: 'A flower opens', publisher: 'Example News' }
const server = inject('logoServer')
const crop = { aspect: '9:16' } as const

async function flower(): Promise<Blob> {
  return (await fetch(flowerUrl)).blob()
}

/** A solid magenta square, a colour the flower clip never has. */
async function createMagenta(size = 64): Promise<Blob> {
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ff00ff'
  ctx.fillRect(0, 0, size, size)
  return canvas.convertToBlob({ type: 'image/png' })
}

const isMagenta = ([r, g, b]: [number, number, number]) => r > 180 && g < 100 && b > 180
const isRed = ([r, g, b]: [number, number, number]) => r > 180 && g < 90 && b < 90

/** The default clip size for the flower fixture (9:16 of 540p, scaled up): the stamp is drawn at it. */
const W = 1080
const H = 1920

/** Where a square logo is stamped in a clip of the default size. */
function getStampBox(position: StampPosition = 'top-right', size = STAMP_SIZE) {
  const margin = STAMP_MARGINS[position]
  const side = Math.round(size * W)
  const left = Math.round(margin.x * W)
  const top = Math.round(margin.y * H)
  const x = position.endsWith('left') ? left : W - left - side
  const y = position.startsWith('top') ? top : H - top - side
  return { x, y, side, centre: { x: x + side / 2, y: y + side / 2 } }
}

describe('stamp', () => {
  it('draws the logo in the top-right corner of every clip frame, clear of the top bar, and not on the card', async () => {
    const frames = trackFrames()
    const clip = await createSplice({
      source: await flower(),
      start: 0,
      end: 2,
      crop,
      origin,
      stamp: { logo: await createMagenta() },
      endCard: { duration: 1.5 },
    }).finally(() => frames.restore())
    expect(frames.open, 'VideoFrames left open').toBe(0)

    // 0.18 of the width, 0.05 of the width from the right and 0.11 of the height from the top.
    const { x, y } = getStampBox().centre
    for (const time of [0.1, 1, 1.9]) {
      const image = await pixelsAt(clip, time)
      expect([image.width, image.height]).toEqual([W, H])
      expect(isMagenta(colourAt(image, x, y, 20)), `stamp at ${time}s`).toBe(true)
      expect(isMagenta(colourAt(image, W - x, y, 20))).toBe(false)
      expect(isMagenta(colourAt(image, x, H - y, 20))).toBe(false)
    }
    expect(isMagenta(colourAt(await pixelsAt(clip, 3.2), x, y, 20)), 'stamp on the card').toBe(false)
  })

  it('moves to another corner with a safe inset, at the size asked for', async () => {
    const stamp = { logo: await createMagenta(), position: 'bottom-right' as const, size: 0.25, opacity: 1 }
    const clip = await createSplice({ source: await flower(), start: 0, end: 1, crop, stamp })
    const box = getStampBox('bottom-right', 0.25)

    // Above the bottom 24% (captions, account name) and in from the right-hand button rail.
    expect(box.y + box.side).toBeLessThanOrEqual(Math.round(H * 0.76))
    expect(box.x + box.side).toBeLessThanOrEqual(Math.round(W * 0.8))
    const [r, g, b] = colourAt(await pixelsAt(clip, 0.5), box.centre.x, box.centre.y, 20)
    expect(r).toBeGreaterThan(230)
    expect(g).toBeLessThan(40)
    expect(b).toBeGreaterThan(230)
  })

  it('loads an SVG URL, including one with only a viewBox', async () => {
    const svg = (attrs: string) =>
      `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" ${attrs}><rect width="10" height="10" fill="#ff00ff"/></svg>`)}`
    const { x, y } = getStampBox().centre

    for (const logo of [svg('width="10" height="10" viewBox="0 0 10 10"'), svg('viewBox="0 0 10 10"')]) {
      const warnings: string[] = []
      const clip = await createSplice({
        source: await flower(),
        start: 0,
        end: 0.5,
        crop,
        stamp: { logo },
        onWarning: (message) => warnings.push(message),
      })
      expect(warnings).toEqual([])
      expect(isMagenta(colourAt(await pixelsAt(clip, 0.2), x, y, 20)), logo).toBe(true)
    }
  })

  it('loads a cross-origin logo that sends CORS headers', async () => {
    const warnings: string[] = []
    const stamp = { logo: `${server}/red-cors.png`, opacity: 1 }
    const clip = await createSplice({ source: await flower(), start: 0, end: 0.5, crop, stamp, onWarning: (message) => warnings.push(message) })
    expect(warnings).toEqual([])
    const { x, y } = getStampBox().centre
    expect(isRed(colourAt(await pixelsAt(clip, 0.2), x, y, 20))).toBe(true)
  })

  it('makes the clip without a cross-origin logo that has no CORS headers, and warns for each', async () => {
    const warnings: string[] = []
    const logo = `${server}/red.png`
    const clip = await createSplice({
      source: await flower(),
      start: 0,
      end: 1,
      crop,
      origin,
      stamp: { logo, opacity: 1 },
      endCard: { logo, duration: 1 },
      onWarning: (message) => warnings.push(message),
    })
    expect(clip.size).toBeGreaterThan(1000)
    expect(warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('The stamp is left out'), expect.stringContaining('The end card logo is left out')]),
    )
    expect(warnings[0]).toContain(logo)
    const { x, y } = getStampBox().centre
    expect(isRed(colourAt(await pixelsAt(clip, 0.5), x, y, 20))).toBe(false)
  })
})
