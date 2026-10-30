import { describe, expect, it, vi } from 'vite-plus/test'
import { createEndCard } from '@/splice/endcard'

/**
 * A 2D context that records what's drawn. Text is measured as 0.55em per character, from the size in
 * the current font, which is close enough to a sans-serif for layout to behave as it would on a canvas.
 */
function createRecordingContext(width = 1080, height = 1920) {
  const texts: Array<{ text: string; font: string; y: number }> = []
  const ctx = {
    canvas: { width, height },
    font: '10px sans-serif',
    fillStyle: '#000',
    globalAlpha: 1,
    textAlign: 'start',
    textBaseline: 'alphabetic',
    save: vi.fn(),
    restore: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    measureText(text: string) {
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 10)
      return { width: Array.from(text).length * size * 0.55 }
    },
    fillText: vi.fn(function (this: { font: string }, text: string, _x: number, y: number) {
      texts.push({ text, font: this.font, y })
    }),
  }
  return { ctx: ctx as unknown as OffscreenCanvasRenderingContext2D, texts }
}

const origin = {
  url: 'https://www.acme.news/2026/10/tides-rising?utm=x#ml-t=4,9',
  title: 'Tides are rising faster than expected',
  publisher: 'Acme News',
}
const lastFrame = {} as OffscreenCanvas
const sizeOf = (font: string) => Number(/(\d+)px/.exec(font)?.[1])

describe('createEndCard', () => {
  it('lasts 2.5 seconds by default', () => {
    expect(createEndCard({}, origin, null).duration).toBe(2.5)
    expect(createEndCard({ duration: 1 }, origin, null).duration).toBe(1)
  })

  it('draws the publisher, title, call to action and readable address, top to bottom', () => {
    const { ctx, texts } = createRecordingContext()
    createEndCard({}, origin, null).draw(ctx, 2, lastFrame)

    const order = ['Acme News', 'Tides are rising', 'Watch the full video at', 'acme.news/2026/10/tides-rising']
    const ys = order.map((start) => texts.find((entry) => entry.text.startsWith(start))!.y)
    expect([...ys].sort((a, b) => a - b)).toEqual(ys)

    // The address is the article, without its scheme, www., query or hash, in large type.
    const address = texts.find((entry) => entry.text === 'acme.news/2026/10/tides-rising')!
    expect(sizeOf(address.font)).toBeGreaterThanOrEqual(Math.round(1080 * 0.04))
    expect(Math.min(...ys)).toBeGreaterThan(1920 * 0.2)
    expect(Math.max(...ys)).toBeLessThan(1920 * 0.8)
  })

  it('takes its own title, publisher and address over the origin', () => {
    const { ctx, texts } = createRecordingContext()
    createEndCard({ title: 'Own title', publisher: 'Own', displayUrl: 'acme.news/tides' }, origin, null).draw(ctx, 2, lastFrame)
    expect(texts.map((entry) => entry.text)).toEqual(['Own', 'Own title', 'Watch the full video at', 'acme.news/tides'])
  })

  it('hides the call to action for an empty cta', () => {
    const { ctx, texts } = createRecordingContext()
    createEndCard({ cta: '' }, origin, null).draw(ctx, 2, lastFrame)
    expect(texts.map((entry) => entry.text)).not.toContain('Watch the full video at')
  })

  it('shortens a long address in the middle to fit', () => {
    const { ctx, texts } = createRecordingContext()
    const displayUrl = 'acme.news/2026/10/03/science/climate/coasts/tides-are-rising-faster-than-anyone-expected'
    createEndCard({ displayUrl }, origin, null).draw(ctx, 2, lastFrame)

    const address = texts.at(-1)!
    expect(address.text).toMatch(/^acme\.news.*….*expected$/)
    ctx.font = address.font
    expect(ctx.measureText(address.text).width).toBeLessThanOrEqual(1080 * 0.9)
  })

  it('fades in over the clip’s last frame', () => {
    const { ctx } = createRecordingContext()
    const card = createEndCard({}, origin, null)
    card.draw(ctx, 0, lastFrame)
    expect(ctx.drawImage).toHaveBeenCalledWith(lastFrame, 0, 0, 1080, 1920)
    expect(ctx.globalAlpha).toBe(0)
    card.draw(ctx, 1, lastFrame)
    expect(ctx.globalAlpha).toBe(1)
  })
})
