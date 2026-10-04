import type { Context2D } from '@/render/captions'
import type { WatermarkOptions } from '@/types'

export function createWatermarkPainter(width: number, height: number, options: WatermarkOptions) {
  const size = Math.max(8, Math.round(height * (options.size ?? 0.022)))
  const font = `600 ${size}px ${options.font ?? 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'}`
  const band = Math.round(size * 1.8)
  const top = options.position === 'bottom' ? height - band : 0
  let text: string | null = null

  return function paint(ctx: Context2D) {
    ctx.save()
    ctx.font = font
    if (text === null) {
      text = options.text
      const room = width - size * 2
      while (text.length > 1 && ctx.measureText(text).width > room) {
        text = `${text.slice(0, -2).trimEnd()}…`
      }
    }
    ctx.fillStyle = options.background ?? 'rgba(0, 0, 0, 0.45)'
    ctx.fillRect(0, top, width, band)
    ctx.fillStyle = options.color ?? '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, width / 2, top + band / 2)
    ctx.restore()
  }
}
