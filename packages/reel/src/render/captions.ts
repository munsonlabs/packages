import type { CaptionCue, CaptionStyle } from '@/types'

export type Context2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D

/**
 * The caption look: bold white text on a translucent dark box behind each line, 4.5% of the frame's
 * height, its bottom 14% above the frame's bottom, lines wrapping at 86% of the width. Sizes and
 * distances are fractions of the frame, so it looks the same at 404x720 and 1080x1920.
 */
const defaultStyle: Required<CaptionStyle> = {
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontWeight: 700,
  size: 0.045,
  color: '#ffffff',
  background: 'rgba(0, 0, 0, 0.6)',
  position: 'bottom',
  margin: 0.14,
  maxWidth: 0.86,
}

const LINE_HEIGHT = 1.3

/**
 * Wraps on spaces, keeping the text's own line breaks; a single word wider than the line is left whole.
 */
export function wrapText(ctx: Context2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    if (line) {
      lines.push(line)
    }
  }
  return lines
}

export interface CaptionPainterOptions {
  layoutWidth?: number
  layoutHeight?: number
}

export interface CaptionPainter {
  (ctx: Context2D, items: readonly (CaptionCue | string)[]): void
  showing(items: readonly (CaptionCue | string)[]): string
}

/**
 * A painter for captions on a `width` x `height` context in the caption look with `style` on top.
 * Each text's lines are wrapped once and remembered. The picker's preview paints with this same
 * function, laid out at the export's size, so what it shows is what the clip gets.
 */
export function createCaptionPainter(width: number, height: number, style: CaptionStyle = {}, options: CaptionPainterOptions = {}): CaptionPainter {
  const s = { ...defaultStyle }
  for (const [key, value] of Object.entries(style)) {
    if (value !== undefined) {
      ;(s as Record<string, unknown>)[key] = value
    }
  }
  const layoutWidth = options.layoutWidth && options.layoutWidth > 0 ? options.layoutWidth : width
  const layoutHeight = options.layoutHeight && options.layoutHeight > 0 ? options.layoutHeight : height
  const scaleX = width / layoutWidth
  const scaleY = height / layoutHeight
  const fontSize = Math.max(8, Math.round(layoutHeight * s.size))
  const font = `${s.fontWeight} ${fontSize}px ${s.fontFamily}`
  const lineHeight = Math.round(fontSize * LINE_HEIGHT)
  const padX = Math.round(fontSize * 0.4)
  const padY = Math.round(fontSize * 0.15)
  const wrapped = new Map<string, string[]>()

  const textOf = (item: CaptionCue | string) => (typeof item === 'string' ? item : item.text)

  function paint(ctx: Context2D, items: readonly (CaptionCue | string)[]): void {
    if (items.length === 0) {
      return
    }
    ctx.save()
    ctx.font = font
    const lines: string[] = []
    for (const text of items.map(textOf)) {
      let textLines = wrapped.get(text)
      if (!textLines) {
        textLines = wrapText(ctx, text, layoutWidth * s.maxWidth)
        wrapped.set(text, textLines)
      }
      lines.push(...textLines)
    }
    if (lines.length === 0) {
      ctx.restore()
      return
    }
    if (scaleX !== 1 || scaleY !== 1) {
      ctx.scale(scaleX, scaleY)
    }
    const blockHeight = lines.length * lineHeight
    const margin = Math.round(layoutHeight * s.margin)
    const top = s.position === 'top' ? margin : s.position === 'middle' ? (layoutHeight - blockHeight) / 2 : layoutHeight - margin - blockHeight
    const centreX = layoutWidth / 2
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    lines.forEach((line, index) => {
      const centreY = top + index * lineHeight + lineHeight / 2
      if (s.background) {
        const lineWidth = ctx.measureText(line).width
        ctx.fillStyle = s.background
        ctx.fillRect(centreX - lineWidth / 2 - padX, centreY - lineHeight / 2 + padY / 2, lineWidth + padX * 2, lineHeight - padY)
      }
      ctx.fillStyle = s.color
      ctx.fillText(line, centreX, centreY)
    })
    ctx.restore()
  }

  const painter = paint as CaptionPainter
  painter.showing = (items) => items.map(textOf).join('\u0000')
  return painter
}
