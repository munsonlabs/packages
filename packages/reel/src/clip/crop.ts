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
 * The frame every clip is at least as big as by default, as `[short side, long side]`: 1080x1920 for
 * 9:16, turned for landscape. A crop window smaller than that is scaled up to it, because a clip is
 * watched full screen on a phone and everything reel paints on it (captions, end card, stamp,
 * watermark) is drawn at the output's size: at a 720p source's native 404x720, that text would be
 * upscaled about 2.7x by the phone and look soft.
 */
const DEFAULT_FRAME: readonly [number, number] = [1080, 1920]

/**
 * The height of the largest frame of `aspect` (width / height) that fits {@link DEFAULT_FRAME}, turned
 * to match the aspect's orientation: 1920 for 9:16, 1080 for 16:9 and 1:1, 1350 for 4:5.
 */
function defaultHeight(aspect: number): number {
  const [short, long] = DEFAULT_FRAME
  const [boxWidth, boxHeight] = aspect > 1 ? [long, short] : [short, long]
  return Math.min(boxHeight, boxWidth / aspect)
}

/**
 * The largest window of the requested aspect inside the frame, centred on the focus point and clamped
 * to the frame, and the even output size it is scaled to. Without `height`, that is the window's own
 * size or the largest frame of its aspect that fits 1080x1920 (1920x1080 for landscape), whichever is
 * bigger: small sources are scaled up, larger windows never scaled down. `height` sets it outright, in
 * either direction. Whole pixels throughout.
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

  // The requested aspect, not the rounded window's, so 9:16 of 1080p is 1080x1920 rather than 1078x1918.
  const aspect = ratio ? ratio[0] / ratio[1] : sourceWidth / sourceHeight
  const outputHeight = even(options.height ?? Math.max(height, defaultHeight(aspect)))
  const outputWidth = even((outputHeight * width) / height)

  return { left, top, width, height, outputWidth, outputHeight }
}
