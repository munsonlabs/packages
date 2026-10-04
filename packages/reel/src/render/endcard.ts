import { wrapText, type Context2D } from '@/render/captions'
import type { LoadedImage } from '@/render/image'
import type { ClipOrigin, ClipWarning, EndCardInfo, EndCardOptions, EndCardTheme, ImageSource } from '@/types'
import { readableUrl } from '@/utils/url'

const defaultTheme: Required<EndCardTheme> = {
  background: '#10241a',
  color: '#ffffff',
  accent: '#e2a32e',
  font: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}

const fadeIn = 0.35

export interface PreparedEndCard {
  duration: number
  draw: (ctx: OffscreenCanvasRenderingContext2D, time: number) => void
}

/**
 * Resolves `endCard` against the clip (title, publisher and readable address from the origin) and loads
 * the logo up front, so drawing a frame does no I/O. A logo that cannot be used is left out and reported
 * through `warn`.
 */
export async function prepareEndCard(
  option: EndCardOptions | true,
  context: {
    origin?: ClipOrigin
    link: string | null
    width: number
    height: number
    lastFrame: OffscreenCanvas
    loadImage: (source: ImageSource) => Promise<LoadedImage>
    warn: (warning: ClipWarning) => void
  },
): Promise<PreparedEndCard> {
  const options: EndCardOptions = option === true ? {} : option
  const duration = Math.max(0, options.duration ?? 2.5)
  const article = context.origin?.url
  const shown = options.displayUrl ?? (article ? readableUrl(article) : null)
  const theme = { ...defaultTheme, ...options.theme }
  const loaded = options.logo ? await context.loadImage(options.logo) : null
  if (loaded && !loaded.ok) {
    context.warn({ reason: 'logo-unavailable', target: 'endCard', message: `reel: the end card logo is left out. ${loaded.message}` })
  }

  const base = {
    width: context.width,
    height: context.height,
    duration,
    title: options.title ?? context.origin?.title ?? null,
    url: context.link,
    displayUrl: shown || null,
    publisher: options.publisher ?? context.origin?.publisher ?? null,
    cta: options.cta ?? 'Watch the full video at',
    logo: loaded?.ok ? loaded.bitmap : null,
    theme,
    lastFrame: context.lastFrame,
  }
  const render = options.draw ?? drawEndCard

  return {
    duration,
    draw(ctx, time) {
      const info: EndCardInfo = { ...base, time, progress: duration > 0 ? Math.min(1, time / duration) : 1 }
      ctx.save()
      render(ctx, info)
      ctx.restore()
    },
  }
}

interface Block {
  height: number
  space?: number
  draw: (top: number) => void
}

function roundedRect(ctx: Context2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, height / 2, width / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

/**
 * The default card: the theme's background faded in over the clip's last frame, then a centred column of
 * logo, publisher, headline and the article's address on an accent pill under a short call to action,
 * shortened in the middle (domain and slug kept) when too wide. Sizes scale with the frame. Exported so
 * a custom `draw` can call it and add to it.
 */
export function drawEndCard(ctx: Context2D, info: EndCardInfo): void {
  const { width, height, theme } = info
  const unit = Math.min(width, height * 0.75)
  const fade = Math.min(1, info.time / fadeIn)

  ctx.drawImage(info.lastFrame, 0, 0, width, height)
  ctx.save()
  ctx.globalAlpha = fade
  ctx.fillStyle = theme.background
  ctx.fillRect(0, 0, width, height)

  const gap = Math.round(unit * 0.04)
  const maxWidth = width * 0.84
  const blocks: Block[] = []
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const font = (size: number, weight: number) => `${weight} ${size}px ${theme.font}`
  const text = (value: string, size: number, weight: number, colour: string, maxLines: number, space = 0) => {
    ctx.font = font(size, weight)
    const lines = wrapText(ctx, value, maxWidth).slice(0, maxLines)
    const lineHeight = Math.round(size * 1.22)
    blocks.push({
      height: lines.length * lineHeight,
      space,
      draw: (top) => {
        ctx.font = font(size, weight)
        ctx.fillStyle = colour
        lines.forEach((line, i) => ctx.fillText(line, width / 2, top + i * lineHeight + lineHeight / 2))
      },
    })
  }

  if (info.logo) {
    const logo = info.logo
    const logoHeight = Math.min(height * 0.09, (logo.height * maxWidth * 0.5) / logo.width)
    const logoWidth = (logo.width * logoHeight) / logo.height
    blocks.push({ height: logoHeight, draw: (top) => ctx.drawImage(logo, (width - logoWidth) / 2, top, logoWidth, logoHeight) })
  }
  if (info.publisher) {
    text(info.publisher, Math.round(unit * 0.045), 700, theme.accent, 1)
  }
  if (info.title) {
    text(info.title, Math.round(unit * 0.078), 700, theme.color, 4)
  }
  if (info.cta && info.displayUrl) {
    text(info.cta, Math.round(unit * 0.042), 500, theme.color, 1, gap * 1.5)
  }
  if (info.displayUrl) {
    // The largest size at which the whole address fits; below the smallest, it is shortened instead,
    // segment by segment with the domain and slug kept (readableUrl leaves it whole when it fits).
    const pillMax = width * 0.9
    const padX = Math.round(unit * 0.04)
    const room = pillMax - padX * 2
    let size = Math.round(unit * 0.062)
    const smallest = Math.round(unit * 0.04)
    ctx.font = font(size, 700)
    while (size > smallest && ctx.measureText(info.displayUrl).width > room) {
      size -= 1
      ctx.font = font(size, 700)
    }
    const shown = readableUrl(info.displayUrl, room, (value) => ctx.measureText(value).width)
    const pillWidth = Math.min(pillMax, ctx.measureText(shown).width + padX * 2)
    const pillHeight = Math.round(size * 1.9)
    blocks.push({
      height: pillHeight,
      space: info.cta ? 0 : gap * 1.5,
      draw: (top) => {
        ctx.fillStyle = theme.accent
        roundedRect(ctx, (width - pillWidth) / 2, top, pillWidth, pillHeight, pillHeight / 2)
        ctx.fill()
        ctx.font = font(size, 700)
        ctx.fillStyle = theme.background
        ctx.fillText(shown, width / 2, top + pillHeight / 2)
      },
    })
  }

  const spacing = blocks.reduce((sum, block, i) => sum + (i > 0 ? gap + (block.space ?? 0) : 0), 0)
  const total = blocks.reduce((sum, block) => sum + block.height, 0) + spacing
  let top = Math.max(gap, (height - total) / 2)
  blocks.forEach((block, i) => {
    if (i > 0) {
      top += gap + (block.space ?? 0)
    }
    block.draw(top)
    top += block.height
  })
  ctx.restore()
}
