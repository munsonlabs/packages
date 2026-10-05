import { wrapText, truncateText } from './render'
import { CAPTION_FONT, END_CARD_CTA, END_CARD_DURATION, END_CARD_FADE, END_CARD_THEME } from '@/constants'
import { toReadableUrl } from '@/utils/url'
import type { EndCardOptions, SpliceOrigin } from '@/types/splice'
import type { EndCard, EndCardContent } from '@/types/internal'

interface Block {
  height: number
  space: number
  draw: (top: number) => void
}

/**
 * Creates the end card shown after the clip. The title, publisher and address default to the
 * origin's, and the logo is already loaded so drawing a frame doesn't load anything.
 */
export function createEndCard(endCard: EndCardOptions, origin: SpliceOrigin | undefined, logo: ImageBitmap | null): EndCard {
  const duration = Math.max(0, endCard.duration ?? END_CARD_DURATION)
  const content: EndCardContent = {
    title: endCard.title ?? origin?.title,
    publisher: endCard.publisher ?? origin?.publisher,
    address: endCard.displayUrl ?? (origin && toReadableUrl(origin.url)),
    cta: endCard.cta ?? END_CARD_CTA,
    theme: { ...END_CARD_THEME, ...endCard.theme },
    logo,
  }

  return { duration, draw: (ctx, time, lastFrame) => drawEndCard(ctx, content, time, lastFrame) }
}

/**
 * Draws one frame of the card. The background fades in over the clip's last frame, then there's a
 * centred column with the logo, publisher, title, call to action and the address on a pill.
 * Everything scales with the frame.
 */
function drawEndCard(ctx: OffscreenCanvasRenderingContext2D, content: EndCardContent, time: number, lastFrame: OffscreenCanvas): void {
  const { width, height } = ctx.canvas
  const { theme, logo } = content
  const unit = Math.min(width, height * 0.75)
  const gap = Math.round(unit * 0.04)
  const maxWidth = width * 0.84
  const centreX = width / 2
  const fade = Math.min(1, time / END_CARD_FADE)
  const blocks: Block[] = []

  const toFont = (size: number, weight: number) => `${weight} ${size}px ${CAPTION_FONT}`

  const addText = (text: string, size: number, weight: number, color: string, maxLines: number, space = 0) => {
    ctx.font = toFont(size, weight)
    const lines = wrapText(ctx, text, maxWidth).slice(0, maxLines)
    const lineHeight = Math.round(size * 1.22)

    blocks.push({
      height: lines.length * lineHeight,
      space,
      draw: (top) => {
        ctx.font = toFont(size, weight)
        ctx.fillStyle = color
        lines.forEach((line, index) => ctx.fillText(line, centreX, top + index * lineHeight + lineHeight / 2))
      },
    })
  }

  const addLogo = (image: ImageBitmap) => {
    const logoHeight = Math.min(height * 0.09, (image.height * maxWidth * 0.5) / image.width)
    const logoWidth = (image.width * logoHeight) / image.height
    blocks.push({ height: logoHeight, space: 0, draw: (top) => ctx.drawImage(image, (width - logoWidth) / 2, top, logoWidth, logoHeight) })
  }

  const addAddress = (address: string, space: number) => {
    const pillMax = width * 0.9
    const padX = Math.round(unit * 0.04)
    const room = pillMax - padX * 2
    const smallest = Math.round(unit * 0.04)
    let size = Math.round(unit * 0.062)

    ctx.font = toFont(size, 700)
    while (size > smallest && ctx.measureText(address).width > room) {
      size -= 1
      ctx.font = toFont(size, 700)
    }

    const shown = truncateText(ctx, address, room)
    const pillWidth = Math.min(pillMax, ctx.measureText(shown).width + padX * 2)
    const pillHeight = Math.round(size * 1.9)

    blocks.push({
      height: pillHeight,
      space,
      draw: (top) => {
        ctx.fillStyle = theme.accent
        ctx.beginPath()
        ctx.roundRect((width - pillWidth) / 2, top, pillWidth, pillHeight, pillHeight / 2)
        ctx.fill()
        ctx.font = toFont(size, 700)
        ctx.fillStyle = theme.background
        ctx.fillText(shown, centreX, top + pillHeight / 2)
      },
    })
  }

  ctx.save()
  ctx.drawImage(lastFrame, 0, 0, width, height)
  ctx.globalAlpha = fade
  ctx.fillStyle = theme.background
  ctx.fillRect(0, 0, width, height)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (logo) addLogo(logo)
  if (content.publisher) addText(content.publisher, Math.round(unit * 0.045), 700, theme.accent, 1)
  if (content.title) addText(content.title, Math.round(unit * 0.078), 700, theme.color, 4)
  if (content.address && content.cta) addText(content.cta, Math.round(unit * 0.042), 500, theme.color, 1, gap * 1.5)
  if (content.address) addAddress(content.address, content.cta ? 0 : gap * 1.5)

  const spacing = blocks.reduce((sum, block, index) => sum + (index > 0 ? gap + block.space : 0), 0)
  const total = blocks.reduce((sum, block) => sum + block.height, 0) + spacing
  let top = Math.max(gap, (height - total) / 2)

  blocks.forEach((block, index) => {
    if (index > 0) top += gap + block.space
    block.draw(top)
    top += block.height
  })
  ctx.restore()
}
