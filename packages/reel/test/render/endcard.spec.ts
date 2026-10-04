import { describe, expect, it, vi } from 'vite-plus/test'
import { drawEndCard, prepareEndCard } from '@/render/endcard'
import type { EndCardInfo } from '@/types'

/**
 * A 2D context that records what is drawn. Text is measured as 0.55em per character, from the size in
 * the current font, which is close enough to a sans-serif for layout to behave as it would on a canvas.
 */
function recordingContext() {
  const texts: Array<{ text: string; font: string; x: number; y: number }> = []
  const ctx = {
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
    moveTo: vi.fn(),
    arcTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    measureText(text: string) {
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 10)
      return { width: Array.from(text).length * size * 0.55 }
    },
    fillText: vi.fn(function (this: { font: string }, text: string, x: number, y: number) {
      texts.push({ text, font: this.font, x, y })
    }),
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts }
}

function info(overrides: Partial<EndCardInfo> = {}): EndCardInfo {
  return {
    width: 1080,
    height: 1920,
    time: 2,
    duration: 2.5,
    progress: 0.8,
    title: 'Tides are rising faster than expected',
    url: 'https://www.acme.news/2026/10/tides-rising#ml-t=4,9',
    displayUrl: 'acme.news/2026/10/tides-rising',
    publisher: 'Acme News',
    cta: 'Watch the full video at',
    logo: null,
    theme: { background: '#10241a', color: '#ffffff', accent: '#e2a32e', font: 'sans-serif' },
    lastFrame: {} as OffscreenCanvas,
    ...overrides,
  }
}

const sizeOf = (font: string) => Number(/(\d+)px/.exec(font)?.[1])

describe('drawEndCard', () => {
  it('draws the readable address as the largest line under the headline', () => {
    const { ctx, texts } = recordingContext()
    drawEndCard(ctx, info())
    const lines = texts.map((entry) => entry.text)
    expect(lines).toContain('acme.news/2026/10/tides-rising')
    expect(lines).toContain('Acme News')
    expect(lines).toContain('Watch the full video at')
    const order = ['Acme News', 'Tides are rising', 'Watch the full video at', 'acme.news/2026/10/tides-rising']
    const ys = order.map((start) => texts.find((entry) => entry.text.startsWith(start))!.y)
    expect([...ys].sort((a, b) => a - b)).toEqual(ys)
    const address = texts.find((entry) => entry.text === 'acme.news/2026/10/tides-rising')!
    expect(sizeOf(address.font)).toBeGreaterThanOrEqual(Math.round(1080 * 0.045))
    // Everything sits inside the frame, vertically centred as a group.
    expect(Math.min(...ys)).toBeGreaterThan(1920 * 0.2)
    expect(Math.max(...ys)).toBeLessThan(1920 * 0.8)
  })

  it('shortens a long address in the middle, keeping the domain and the slug', () => {
    const { ctx, texts } = recordingContext()
    drawEndCard(ctx, info({ displayUrl: 'acme.news/2026/10/03/science/climate/coasts/tides-are-rising' }))
    const address = texts.at(-1)!
    expect(address.text).toMatch(/^acme\.news\/.*…\/tides-are-rising$/)
    ctx.font = address.font
    expect(ctx.measureText(address.text).width).toBeLessThanOrEqual(1080 * 0.9)
  })
})

describe('prepareEndCard', () => {
  const context = {
    origin: { url: 'https://www.acme.news/2026/10/tides-rising?utm=x', title: 'Tides', publisher: 'Acme' },
    link: 'https://www.acme.news/2026/10/tides-rising?utm=x#ml-t=4,9',
    width: 1080,
    height: 1920,
    lastFrame: {} as OffscreenCanvas,
    loadImage: async () => ({ ok: false as const, message: 'nope' }),
    warn: vi.fn(),
  }

  function capture(option: Parameters<typeof prepareEndCard>[0]) {
    let seen: EndCardInfo | undefined
    const draw = (_ctx: unknown, value: EndCardInfo) => (seen = value)
    return prepareEndCard(typeof option === 'object' ? { ...option, draw } : { draw }, context).then((card) => {
      card.draw({ save() {}, restore() {} } as unknown as OffscreenCanvasRenderingContext2D, 0)
      return seen!
    })
  }

  it('shows the article, not the deep link, and passes the deep link on', async () => {
    const seen = await capture(true)
    expect(seen.displayUrl).toBe('acme.news/2026/10/tides-rising')
    expect(seen.url).toBe(context.link)
    expect(seen.cta).toBe('Watch the full video at')
  })

  it('takes a displayUrl as given', async () => {
    const seen = await capture({ displayUrl: 'acme.news/tides' })
    expect(seen.displayUrl).toBe('acme.news/tides')
  })

  it('reports a logo that cannot be loaded and draws without it', async () => {
    const warn = vi.fn()
    const card = await prepareEndCard({ logo: 'https://elsewhere.example/logo.png' }, { ...context, warn })
    expect(card.duration).toBe(2.5)
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ reason: 'logo-unavailable', target: 'endCard' }))
  })
})
