import type { CropOptions, CropFocus } from '@/types'

export interface CropPlan {
  left: number
  top: number
  width: number
  height: number
  outputWidth: number
  outputHeight: number
}

/**
 * `'9:16'` → `[9, 16]`; `'source'` → `null` (no crop). Anything else throws: a silently wrong aspect
 * would only show up as a strangely shaped video at the end of a long export.
 */
export function parseAspect(aspect: string): [number, number] | null {
  if (aspect === 'source') {
    return null
  }
  const match = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(aspect)
  if (!match) {
    throw new RangeError(`reel: aspect must look like '9:16', got '${aspect}'`)
  }
  const w = Number(match[1])
  const h = Number(match[2])
  if (!(w > 0 && h > 0)) {
    throw new RangeError(`reel: aspect must be positive, got '${aspect}'`)
  }
  return [w, h]
}

/**
 * Rounds down to an even number, at least 2. H.264 encoders work in 4:2:0 and several reject odd
 * dimensions outright, so every output size passes through here.
 */
export function even(value: number): number {
  return Math.max(2, Math.floor(value / 2) * 2)
}

function clamp01(value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) {
    return 0.5
  }
  return Math.min(1, Math.max(0, value))
}

function focusOf(focus: CropFocus | undefined): { x: number; y: number } {
  if (typeof focus === 'number') {
    return { x: clamp01(focus), y: 0.5 }
  }
  return { x: clamp01(focus?.x), y: clamp01(focus?.y) }
}

/**
 * The largest window of the requested aspect inside the frame, centred on the focus point and clamped
 * to the frame, and the even output size it is scaled to (the window's own height unless `height` asks
 * for more, so nothing is upscaled by default). Whole pixels throughout.
 */
export function planCrop(sourceWidth: number, sourceHeight: number, options: CropOptions = {}): CropPlan {
  const ratio = parseAspect(options.aspect ?? '9:16')
  let width = sourceWidth
  let height = sourceHeight
  if (ratio) {
    const target = ratio[0] / ratio[1]
    if (sourceWidth / sourceHeight > target) {
      width = Math.round(sourceHeight * target)
    } else {
      height = Math.round(sourceWidth / target)
    }
  }

  const focus = focusOf(options.focus)
  const left = Math.round(Math.min(sourceWidth - width, Math.max(0, focus.x * sourceWidth - width / 2)))
  const top = Math.round(Math.min(sourceHeight - height, Math.max(0, focus.y * sourceHeight - height / 2)))

  const outputHeight = even(options.height ?? height)
  const outputWidth = even((outputHeight * width) / height)

  return { left, top, width, height, outputWidth, outputHeight }
}
