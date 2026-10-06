import {
  CAPTION_BACKGROUND,
  CAPTION_COLOR,
  CAPTION_FONT,
  CAPTION_LINE_HEIGHT,
  CAPTION_MARGIN,
  CAPTION_MAX_WIDTH,
  CAPTION_SIZE,
  STAMP_MARGINS,
  STAMP_OPACITY,
  STAMP_SIZE,
  WATERMARK_BACKGROUND,
  WATERMARK_COLOR,
  WATERMARK_SIZE,
} from '@/constants'
import type { CaptionCue, CaptionPosition, CaptionStyle, StampOptions, WatermarkOptions } from '@/types/splice'
import type { Painter } from '@/types/internal'

/**
 * Creates a painter for the captions showing at a frame's time. By default it's bold white text on
 * a dark box per line, at the bottom, top or middle, and style can change any of that. Sizes are
 * fractions of the frame so captions look the same at any output size.
 */
export function createCaptionPainter(
  width: number,
  height: number,
  cues: CaptionCue[],
  position: CaptionPosition = 'bottom',
  style: CaptionStyle = {},
): Painter {
  const {
    fontFamily = CAPTION_FONT,
    fontWeight = 700,
    size = CAPTION_SIZE,
    color = CAPTION_COLOR,
    background = CAPTION_BACKGROUND,
    margin: marginFraction = CAPTION_MARGIN,
    maxWidth: widthFraction = CAPTION_MAX_WIDTH,
  } = style
  const fontSize = Math.max(8, Math.round(height * size))
  const font = `${fontWeight} ${fontSize}px ${fontFamily}`
  const lineHeight = Math.round(fontSize * CAPTION_LINE_HEIGHT)
  const padX = Math.round(fontSize * 0.4)
  const padY = Math.round(fontSize * 0.15)
  const maxWidth = width * widthFraction
  const margin = Math.round(height * marginFraction)
  const centreX = width / 2
  const wrapped = new Map<string, string[]>()

  const getLines = (ctx: OffscreenCanvasRenderingContext2D, text: string) => {
    const lines = wrapped.get(text) ?? wrapText(ctx, text, maxWidth)
    wrapped.set(text, lines)
    return lines
  }

  return (ctx, time) => {
    const showing = cues.filter((cue) => cue.start <= time && time < cue.end)
    if (showing.length === 0) return

    ctx.save()
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const lines = showing.flatMap((cue) => getLines(ctx, cue.text))
    const blockHeight = lines.length * lineHeight
    const tops = { top: margin, middle: (height - blockHeight) / 2, bottom: height - margin - blockHeight }
    const top = tops[position]

    lines.forEach((line, index) => {
      const centreY = top + index * lineHeight + lineHeight / 2
      const lineWidth = ctx.measureText(line).width

      if (background) {
        ctx.fillStyle = background
        ctx.fillRect(centreX - lineWidth / 2 - padX, centreY - lineHeight / 2 + padY / 2, lineWidth + padX * 2, lineHeight - padY)
      }
      ctx.fillStyle = color
      ctx.fillText(line, centreX, centreY)
    })
    ctx.restore()
  }
}

/**
 * Wraps text on spaces to fit maxWidth, keeping any line breaks it already has. A word too long for
 * the line is left whole.
 */
export function wrapText(ctx: OffscreenCanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []

  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    let line = ''

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      const isTooWide = line && ctx.measureText(candidate).width > maxWidth
      if (isTooWide) lines.push(line)
      line = isTooWide ? word : candidate
    }
    if (line) lines.push(line)
  }
  return lines
}

/**
 * Creates a painter for a thin band of text, like the site name, across the top or bottom of every
 * frame.
 */
export function createWatermarkPainter(width: number, height: number, watermark: WatermarkOptions): Painter {
  const size = Math.max(8, Math.round(height * WATERMARK_SIZE))
  const font = `600 ${size}px ${CAPTION_FONT}`
  const band = Math.round(size * 1.8)
  const top = watermark.position === 'bottom' ? height - band : 0
  const room = width - size * 2
  let text: string | undefined

  return (ctx) => {
    ctx.save()
    ctx.font = font
    text ??= truncateText(ctx, watermark.text, room)

    ctx.fillStyle = WATERMARK_BACKGROUND
    ctx.fillRect(0, top, width, band)
    ctx.fillStyle = WATERMARK_COLOR
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, width / 2, top + band / 2)
    ctx.restore()
  }
}

/**
 * Creates a painter for a logo in a corner of every frame. The default margins keep it clear of the
 * buttons TikTok, Reels and Shorts put over vertical video.
 */
export function createStampPainter(width: number, height: number, logo: ImageBitmap, stamp: StampOptions): Painter {
  const position = stamp.position ?? 'top-right'
  const margin = STAMP_MARGINS[position]
  const opacity = stamp.opacity ?? STAMP_OPACITY
  const side = Math.max(1, (stamp.size ?? STAMP_SIZE) * width)
  const scale = Math.min(side / logo.width, side / logo.height)
  const logoWidth = Math.round(logo.width * scale)
  const logoHeight = Math.round(logo.height * scale)
  const left = Math.round(margin.x * width)
  const top = Math.round(margin.y * height)
  const x = position.endsWith('left') ? left : width - left - logoWidth
  const y = position.startsWith('top') ? top : height - top - logoHeight

  return (ctx) => {
    ctx.save()
    ctx.globalAlpha = opacity
    ctx.drawImage(logo, x, y, logoWidth, logoHeight)
    ctx.restore()
  }
}

/**
 * Cuts text down in the middle with an ellipsis until it fits maxWidth, keeping both ends.
 */
export function truncateText(ctx: OffscreenCanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  const chars = Array.from(text)

  for (let keep = chars.length - 1; keep > 0; keep--) {
    const head = Math.ceil(keep / 2)
    const candidate = `${chars.slice(0, head).join('')}…${chars.slice(chars.length - (keep - head)).join('')}`
    if (ctx.measureText(candidate).width <= maxWidth) return candidate
  }
  return '…'
}
