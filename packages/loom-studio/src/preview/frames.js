import { viewportHint, viewports } from './usePreview'

/** What the canvas can show side by side. `one` is the single widget. */
export const frameModes = [
  { value: 'one', label: 'One', icon: 'i-lucide-square' },
  { value: 'widths', label: 'Widths', icon: 'i-lucide-columns-3' },
  { value: 'variants', label: 'Variants', icon: 'i-lucide-git-branch' },
  { value: 'samples', label: 'Samples', icon: 'i-lucide-database' },
  { value: 'schemes', label: 'Light and dark', icon: 'i-lucide-sun-moon' },
]

/** At most this many samples side by side. */
const MAX_SAMPLES = 6

/**
 * @typedef {object} Frame
 * @property {string} key
 * @property {string} label
 * @property {string} icon
 * @property {number | undefined} width Pixels, or `undefined` for the full canvas width.
 * @property {string | undefined} variant Pinned variant, or `undefined` to let the rules pick.
 * @property {number} sampleIndex
 * @property {'auto' | 'light' | 'dark'} scheme
 * @property {boolean} focused The frame being edited: the popover, drag and the tour work in it.
 * @property {object} focus What to set on the preview (and variant) to make this the frame being edited.
 */

/**
 * The frames to draw for a mode. Each is the current preview with one setting changed: its width,
 * variant, sample or scheme. The frame that matches the current preview is the focused one (the
 * first, when none does); clicking another applies its `focus`.
 *
 * @param {string} mode One of `frameModes`.
 * @param {object} p The preview as it is now.
 * @param {{ label: string; icon: string; width?: number }} p.viewport
 * @param {boolean} p.followRules
 * @param {string} p.variantId The variant being edited.
 * @param {{ label: string; value: string }[]} p.variantOptions
 * @param {{ data: unknown; index: number }[]} p.matchingSamples
 * @param {(data: unknown) => string} p.describe
 * @param {number} p.sampleIndex
 * @param {'auto' | 'light' | 'dark'} p.previewScheme
 * @param {'light' | 'dark'} p.activeScheme
 * @returns {Frame[]}
 */
export function framesFor(mode, p) {
  const current = {
    width: p.viewport.width,
    variant: p.followRules ? undefined : p.variantId,
    sampleIndex: p.sampleIndex,
    scheme: p.previewScheme,
  }
  let frames
  if (mode === 'widths') {
    frames = viewports
      .filter((vp) => vp.width)
      .map((vp) => ({
        ...current,
        key: vp.label,
        label: vp.label,
        icon: vp.icon,
        width: vp.width,
        focused: p.viewport.label === vp.label,
        focus: { viewport: vp },
      }))
  } else if (mode === 'variants') {
    frames = p.variantOptions.map((v) => ({
      ...current,
      key: v.value,
      label: v.label,
      icon: 'i-lucide-git-branch',
      variant: v.value,
      focused: v.value === p.variantId,
      focus: { variantId: v.value },
    }))
  } else if (mode === 'samples') {
    frames = p.matchingSamples.slice(0, MAX_SAMPLES).map(({ data, index }) => ({
      ...current,
      key: String(index),
      label: p.describe(data),
      icon: 'i-lucide-database',
      sampleIndex: index,
      focused: index === p.sampleIndex,
      focus: { sampleIndex: index },
    }))
  } else if (mode === 'schemes') {
    frames = ['light', 'dark'].map((scheme) => ({
      ...current,
      key: scheme,
      label: scheme === 'light' ? 'Light' : 'Dark',
      icon: scheme === 'light' ? 'i-lucide-sun' : 'i-lucide-moon',
      scheme,
      focused: p.activeScheme === scheme,
      focus: { previewScheme: scheme },
    }))
  } else {
    return [{ ...current, key: 'one', label: p.viewport.label, icon: p.viewport.icon, focused: true, focus: {} }]
  }
  if (!frames.some((f) => f.focused) && frames[0]) frames[0] = { ...frames[0], focused: true }
  return frames
}

/** The hint under a frame's label: its width and size bucket. */
export const frameHint = (frame) => viewportHint(frame.width)
