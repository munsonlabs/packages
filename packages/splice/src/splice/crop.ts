import { makeEven } from '@/utils/size'
import { MIN_FRAME } from '@/constants'
import type { CropOptions } from '@/types/splice'
import type { CropPlan } from '@/types/internal'

/**
 * Plans the biggest window of the crop's aspect that fits in the frame, centred on the focus point,
 * and the size it gets scaled to. No crop means the whole frame. We draw the whole frame offset so
 * the canvas edges do the cropping, because Safari ignores a source rectangle and draws the full
 * frame anyway.
 */
export function planCrop(sourceWidth: number, sourceHeight: number, crop?: CropOptions): CropPlan {
  const [aspectWidth, aspectHeight] = crop ? crop.aspect.split(':').map(Number) : [sourceWidth, sourceHeight]
  const ratio = aspectWidth / aspectHeight
  const isWider = sourceWidth / sourceHeight > ratio
  const focusX = crop?.focus?.x ?? 0.5
  const focusY = crop?.focus?.y ?? 0.5

  const windowWidth = isWider ? Math.round(sourceHeight * ratio) : sourceWidth
  const windowHeight = isWider ? sourceHeight : Math.round(sourceWidth / ratio)
  const left = Math.round(Math.min(sourceWidth - windowWidth, Math.max(0, focusX * sourceWidth - windowWidth / 2)))
  const top = Math.round(Math.min(sourceHeight - windowHeight, Math.max(0, focusY * sourceHeight - windowHeight / 2)))

  const [short, long] = MIN_FRAME
  const [boxWidth, boxHeight] = ratio > 1 ? [long, short] : [short, long]
  const minHeight = Math.min(boxHeight, boxWidth / ratio)
  const height = makeEven(crop?.height ?? Math.max(windowHeight, minHeight))
  const width = makeEven((height * windowWidth) / windowHeight)
  const scaleX = width / windowWidth
  const scaleY = height / windowHeight

  const draw = { x: -left * scaleX, y: -top * scaleY, width: sourceWidth * scaleX, height: sourceHeight * scaleY }
  return { width, height, draw }
}
