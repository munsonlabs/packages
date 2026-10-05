import { loadCaptions } from './captions'
import { loadImage } from './image'
import { createEndCard } from './endcard'
import { createCaptionPainter, createStampPainter, createWatermarkPainter } from './render'
import { WARNING_LOGO_UNAVAILABLE } from '@/constants'
import type { ImageSource, SpliceOptions } from '@/types/splice'
import type { ClipPlan, Overlays, Painter } from '@/types/internal'

/**
 * Gets everything drawn over the clip ready before encoding starts: captions, watermark, stamp and
 * end card. Captions or logos that won't load are left out with a warning instead of failing the
 * clip.
 */
export async function createOverlays(options: SpliceOptions, plan: ClipPlan): Promise<Overlays> {
  const { width, height } = plan
  const { watermark, stamp, endCard } = options
  const warn = options.onWarning ?? console.warn

  const loadLogo = (source: ImageSource | undefined, name: string) => {
    if (!source) return Promise.resolve(null)
    return loadImage(source).catch((error) => {
      warn(WARNING_LOGO_UNAVAILABLE(name, error instanceof Error ? error.message : String(error)))
      return null
    })
  }

  const [cues, stampLogo, cardLogo] = await Promise.all([
    loadCaptions(options),
    loadLogo(stamp?.logo, 'stamp'),
    loadLogo(endCard?.logo, 'end card logo'),
  ])

  const painters = [
    createCaptionPainter(width, height, cues, options.captionPosition),
    watermark && createWatermarkPainter(width, height, watermark),
    stamp && stampLogo && createStampPainter(width, height, stampLogo, stamp),
  ].filter((painter): painter is Painter => !!painter)

  const paint: Painter = (ctx, time) => painters.forEach((painter) => painter(ctx, time))
  const card = endCard && createEndCard(endCard, options.origin, cardLogo)

  const dispose = () => {
    stampLogo?.close()
    cardLogo?.close()
  }

  return { paint, endCard: card, dispose }
}
