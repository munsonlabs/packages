import type { Context2D } from '@/render/captions'
import type { StampOptions, StampPosition } from '@/types'

/**
 * Default margins, as fractions of width (`x`) and height (`y`), clear of what TikTok, Reels and Shorts
 * draw over a 9:16 video: the status bar and feed tabs at the top (~10%), the account name, caption and
 * sound line at the bottom (~22%), and the like/comment/share rail down the right (~15%) from mid-frame
 * to the caption, which is why bottom-right also moves in by 0.2.
 */
export const stampMargins: Record<StampPosition, { x: number; y: number }> = {
  'top-left': { x: 0.05, y: 0.11 },
  'top-right': { x: 0.05, y: 0.11 },
  'bottom-left': { x: 0.05, y: 0.24 },
  'bottom-right': { x: 0.2, y: 0.24 },
}

export function planStamp(
  width: number,
  height: number,
  logo: { width: number; height: number },
  options: Omit<StampOptions, 'logo'> = {},
): { x: number; y: number; width: number; height: number } {
  const position = options.position ?? 'top-right'
  const defaults = stampMargins[position]
  const margin = typeof options.margin === 'number' ? { x: options.margin, y: (options.margin * width) / height } : { ...defaults, ...options.margin }
  const side = Math.max(1, (options.size ?? 0.18) * width)
  const scale = Math.min(side / logo.width, side / logo.height)
  const w = Math.round(logo.width * scale)
  const h = Math.round(logo.height * scale)
  const left = Math.round(margin.x * width)
  const top = Math.round(margin.y * height)
  return {
    x: position.endsWith('left') ? left : width - left - w,
    y: position.startsWith('top') ? top : height - top - h,
    width: w,
    height: h,
  }
}

export function createStampPainter(width: number, height: number, logo: ImageBitmap, options: Omit<StampOptions, 'logo'>) {
  const box = planStamp(width, height, logo, options)
  const opacity = Math.min(1, Math.max(0, options.opacity ?? 0.9))
  return function paint(ctx: Context2D) {
    ctx.save()
    ctx.globalAlpha = opacity
    ctx.drawImage(logo, box.x, box.y, box.width, box.height)
    ctx.restore()
  }
}
