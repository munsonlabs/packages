import { describe, expect, inject, it } from 'vite-plus/test'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { createClip, planStamp, type ClipWarning } from '@/index'
import { colourAt, pixelsAt, trackFrames } from '@test/browser/helpers'

const origin = { url: 'https://example.com/watch/flower', title: 'A flower opens', publisher: 'Example News' }
const server = inject('logoServer')

async function flower(): Promise<Blob> {
  return (await fetch(flowerUrl)).blob()
}

/** A solid magenta square, a colour the flower clip never has. */
async function magenta(size = 64): Promise<Blob> {
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D
  ctx.fillStyle = '#ff00ff'
  ctx.fillRect(0, 0, size, size)
  return canvas.convertToBlob({ type: 'image/png' })
}

const isMagenta = ([r, g, b]: [number, number, number]) => r > 180 && g < 100 && b > 180
const isRed = ([r, g, b]: [number, number, number]) => r > 180 && g < 90 && b < 90

/** The default clip size for the flower fixture (9:16 of 540p, scaled up): the stamp is drawn at it. */
const W = 1080
const H = 1920

/** The centre of where a 64x64 logo is stamped in a clip of the default size, at `position`. */
function centreOf(position: Parameters<typeof planStamp>[3] = {}) {
  const box = planStamp(W, H, { width: 64, height: 64 }, position)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box }
}

describe('stamp', () => {
  it('draws the logo in the top-right corner of every clip frame, clear of the top bar, and not on the card', async () => {
    const frames = trackFrames()
    let clip: Blob
    try {
      clip = await createClip({ source: await flower(), start: 0, end: 2, origin, stamp: { logo: await magenta() }, endCard: { duration: 1.5 } })
      expect(frames.open, 'VideoFrames left open').toBe(0)
    } finally {
      frames.restore()
    }
    const { x, y, box } = centreOf()
    // 0.18 of the width, 0.05 of the width from the right and 0.11 of the height from the top, of the
    // 1080x1920 output: the 64px logo is drawn at 194px, not at a 304x540 frame's 55px and scaled.
    expect(box).toEqual({ x: 1080 - 54 - 194, y: 211, width: 194, height: 194 })
    for (const time of [0.1, 1, 1.9]) {
      const image = await pixelsAt(clip, time)
      expect(isMagenta(colourAt(image, x, y, 20)), `stamp at ${time}s`).toBe(true)
      // The other corners are untouched.
      expect([image.width, image.height]).toEqual([W, H])
      expect(isMagenta(colourAt(image, W - x, y, 20))).toBe(false)
      expect(isMagenta(colourAt(image, x, H - y, 20))).toBe(false)
    }
    const card = await pixelsAt(clip, 3.2)
    expect(isMagenta(colourAt(card, x, y, 20)), 'stamp on the card').toBe(false)
  })

  it('moves to another corner with a safe inset, at the size asked for', async () => {
    const clip = await createClip({
      source: await flower(),
      start: 0,
      end: 1,
      stamp: { logo: await magenta(), position: 'bottom-right', size: 0.25, opacity: 1 },
    })
    const { x, y, box } = centreOf({ position: 'bottom-right', size: 0.25 })
    // Above the bottom 24% (captions, account name) and in from the right-hand action rail.
    expect(box.y + box.height).toBeLessThanOrEqual(Math.round(H * 0.76))
    expect(box.x + box.width).toBeLessThanOrEqual(Math.round(W * 0.8))
    const [r, g, b] = colourAt(await pixelsAt(clip, 0.5), x, y, 20)
    expect(r).toBeGreaterThan(230)
    expect(g).toBeLessThan(40)
    expect(b).toBeGreaterThan(230)
  })

  it('loads an SVG URL, including one with only a viewBox', async () => {
    const svg = (attrs: string) =>
      `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" ${attrs}><rect width="10" height="10" fill="#ff00ff"/></svg>`)}`
    for (const logo of [svg('width="10" height="10" viewBox="0 0 10 10"'), svg('viewBox="0 0 10 10"')]) {
      const warnings: ClipWarning[] = []
      const clip = await createClip({ source: await flower(), start: 0, end: 0.5, stamp: { logo }, onWarning: (w) => warnings.push(w) })
      expect(warnings).toEqual([])
      const { x, y } = centreOf()
      expect(isMagenta(colourAt(await pixelsAt(clip, 0.2), x, y, 20)), logo).toBe(true)
    }
  })

  it('loads a cross-origin logo that sends CORS headers', async () => {
    const warnings: ClipWarning[] = []
    const clip = await createClip({
      source: await flower(),
      start: 0,
      end: 0.5,
      stamp: { logo: `${server}/red-cors.png`, opacity: 1 },
      onWarning: (w) => warnings.push(w),
    })
    expect(warnings).toEqual([])
    const { x, y } = centreOf()
    expect(isRed(colourAt(await pixelsAt(clip, 0.2), x, y, 20))).toBe(true)
  })

  it('makes the clip without a cross-origin logo that has no CORS headers, and warns', async () => {
    const warnings: ClipWarning[] = []
    const logo = `${server}/red.png`
    const clip = await createClip({
      source: await flower(),
      start: 0,
      end: 1,
      origin,
      stamp: { logo, opacity: 1 },
      endCard: { logo, duration: 1 },
      onWarning: (w) => warnings.push(w),
    })
    expect(clip.size).toBeGreaterThan(1000)
    expect(warnings.map((w) => [w.reason, w.target])).toEqual(
      expect.arrayContaining([
        ['logo-unavailable', 'stamp'],
        ['logo-unavailable', 'endCard'],
      ]),
    )
    expect(warnings[0].message).toContain(logo)
    const { x, y } = centreOf()
    expect(isRed(colourAt(await pixelsAt(clip, 0.5), x, y, 20))).toBe(false)
  })

  it('refuses an <img> that would taint the canvas, rather than failing every frame', async () => {
    // Loaded without crossOrigin, the image displays but drawing it taints a canvas.
    const image = new Image()
    image.src = `${server}/red.png`
    await image.decode()
    const warnings: ClipWarning[] = []
    const clip = await createClip({ source: await flower(), start: 0, end: 0.5, stamp: { logo: image }, onWarning: (w) => warnings.push(w) })
    expect(clip.size).toBeGreaterThan(1000)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatchObject({ reason: 'logo-unavailable', target: 'stamp' })
  })
})
