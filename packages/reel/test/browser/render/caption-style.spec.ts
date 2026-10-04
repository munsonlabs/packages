import { describe, expect, it } from 'vite-plus/test'
import { createCaptionPainter } from '@/render/captions'

const short = 'Short and sweet'
/** Two lines at 304x540, one at 1080x1920. */
const twoLines = 'Captions that wrap onto a second line'
const novel =
  'This caption goes on and on and on, far longer than anything that would ever fit in two lines, so it wraps onto as many lines as it needs and keeps every word'

function canvas(width: number, height: number) {
  const element = new OffscreenCanvas(width, height)
  return { element, ctx: element.getContext('2d')! }
}

/** The painted box: the first and last rows and columns with any visible pixel (alpha over 8). */
function paintedBox(image: ImageData): { top: number; bottom: number; left: number; right: number } | null {
  let top = -1
  let bottom = -1
  let left = image.width
  let right = -1
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (image.data[(y * image.width + x) * 4 + 3] > 8) {
        if (top < 0) top = y
        bottom = y
        left = Math.min(left, x)
        right = Math.max(right, x)
      }
    }
  }
  return top < 0 ? null : { top, bottom, left, right }
}

function paint(width: number, height: number, texts: string[], style?: Parameters<typeof createCaptionPainter>[2]): ImageData {
  const { ctx } = canvas(width, height)
  createCaptionPainter(width, height, style)(ctx, texts)
  return ctx.getImageData(0, 0, width, height)
}

/**
 * reel's first caption painter, copied verbatim from `captions/draw.ts` (now `render/captions.ts`) at
 * the commit that introduced presets (where it became the `'subtitle'` preset), so the one caption look
 * can be held to its exact output.
 */
function legacyPainter(width: number, height: number) {
  const s = {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontWeight: 700,
    size: 0.045,
    color: '#ffffff',
    background: 'rgba(0, 0, 0, 0.6)',
    margin: 0.14,
    maxWidth: 0.86,
  }
  const fontSize = Math.max(8, Math.round(height * s.size))
  const font = `${s.fontWeight} ${fontSize}px ${s.fontFamily}`
  const lineHeight = Math.round(fontSize * 1.3)
  const padX = Math.round(fontSize * 0.4)
  const padY = Math.round(fontSize * 0.15)
  return (ctx: OffscreenCanvasRenderingContext2D, texts: string[]) => {
    ctx.save()
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    const lines: string[] = []
    for (const text of texts) {
      let line = ''
      for (const word of text.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word
        if (line && ctx.measureText(candidate).width > width * s.maxWidth) {
          lines.push(line)
          line = word
        } else {
          line = candidate
        }
      }
      if (line) lines.push(line)
    }
    const top = height - Math.round(height * s.margin) - lines.length * lineHeight
    lines.forEach((line, index) => {
      const centreY = top + index * lineHeight + lineHeight / 2
      const lineWidth = ctx.measureText(line).width
      ctx.fillStyle = s.background
      ctx.fillRect(width / 2 - lineWidth / 2 - padX, centreY - lineHeight / 2 + padY / 2, lineWidth + padX * 2, lineHeight - padY)
      ctx.fillStyle = s.color
      ctx.fillText(line, width / 2, centreY)
    })
    ctx.restore()
  }
}

describe('the caption look', () => {
  it('paints the default look exactly as reel painted captions first (the old subtitle look)', () => {
    for (const [width, height] of [
      [304, 540],
      [720, 1280],
      [1080, 1920],
    ]) {
      for (const texts of [[short], [twoLines], [short, twoLines], [novel]]) {
        const before = canvas(width, height)
        legacyPainter(width, height)(before.ctx, texts)
        const now = paint(width, height, texts)
        const old = before.ctx.getImageData(0, 0, width, height)
        expect(paintedBox(now), `${width}x${height} ${texts.join(' / ')}`).toEqual(paintedBox(old))
        let differing = 0
        for (let i = 0; i < now.data.length; i++) if (now.data[i] !== old.data[i]) differing++
        expect(differing).toBe(0)
      }
    }
    // An empty style, or one of undefined values, is the default look.
    const plain = paint(304, 540, [twoLines])
    for (const style of [{}, { size: undefined, background: undefined }]) {
      const same = paint(304, 540, [twoLines], style)
      expect(same.data.every((value, i) => value === plain.data[i])).toBe(true)
    }
  })

  it('sits near the bottom: the block ends 14% above the frame, centred', () => {
    for (const [width, height] of [
      [304, 540],
      [1080, 1920],
    ]) {
      const box = paintedBox(paint(width, height, [short]))!
      expect(box.bottom).toBeLessThan(height - Math.round(height * 0.14))
      expect(box.bottom).toBeGreaterThan(height - Math.round(height * 0.14) - Math.round(Math.round(height * 0.045) * 1.3))
      expect(Math.abs((box.left + box.right) / 2 - width / 2)).toBeLessThan(2)
    }
  })

  it('takes a custom style over the look', () => {
    const plain = paintedBox(paint(720, 1280, [short]))!
    const custom = paint(720, 1280, [short], { size: 0.09, color: '#ff0000', background: null, margin: 0.4 })
    const box = paintedBox(custom)!
    expect(box.bottom).toBeLessThan(1280 * 0.6 + 2)
    expect(box.bottom - box.top).toBeGreaterThan((plain.bottom - plain.top) * 1.3)
    let red = 0
    let dark = 0
    for (let i = 0; i < custom.data.length; i += 4) {
      if (custom.data[i + 3] > 200 && custom.data[i] > 200 && custom.data[i + 1] < 60) red++
      if (custom.data[i + 3] > 100 && custom.data[i] < 40 && custom.data[i + 1] < 40 && custom.data[i + 2] < 40) dark++
    }
    expect(red).toBeGreaterThan(100)
    // No box behind the text.
    expect(dark).toBe(0)
    const top = paintedBox(paint(720, 1280, [short], { position: 'top', margin: 0.05 }))!
    expect(top.top).toBeGreaterThanOrEqual(Math.round(1280 * 0.05))
    expect(top.top).toBeLessThan(1280 * 0.05 + 20)
    const narrow = paintedBox(paint(720, 1280, [twoLines], { maxWidth: 0.4 }))!
    expect(narrow.right - narrow.left).toBeLessThan(720 * 0.4 + 2 * Math.round(Math.round(1280 * 0.045) * 0.4) + 2)
  })

  it('wraps a long cue onto as many lines as it needs, every word kept, the block still ending at the margin', () => {
    const width = 1080
    const height = 1920
    const lineHeight = Math.round(Math.round(height * 0.045) * 1.3)
    const one = paintedBox(paint(width, height, [short]))!
    const long = paintedBox(paint(width, height, [novel]))!
    expect(long.bottom).toBe(one.bottom)
    expect(long.bottom - long.top).toBeGreaterThan(lineHeight * 2.5)
    expect(long.right - long.left).toBeLessThanOrEqual(width * 0.86 + 2 * Math.round(Math.round(height * 0.045) * 0.4) + 1)
    // Cues showing at once stack, each on its own lines; showing() names what is drawn.
    const painter = createCaptionPainter(width, height)
    expect(
      painter.showing([
        { start: 0, end: 1, text: novel },
        { start: 0, end: 1, text: short },
      ]),
    ).toBe(`${novel}\u0000${short}`)
    expect(painter.showing([])).toBe('')
  })
})
