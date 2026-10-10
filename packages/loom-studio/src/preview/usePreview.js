import { computed, ref, watch } from 'vue'
import { definitionMatches, widthToSize } from '@munsonlabs/loom/editor'

/** The canvas widths the preview offers. */
export const viewports = [
  { label: 'Narrow', icon: 'i-lucide-panel-left', width: 280 },
  { label: 'Phone', icon: 'i-lucide-smartphone', width: 375 },
  { label: 'Tablet', icon: 'i-lucide-tablet', width: 600 },
  { label: 'Fill', icon: 'i-lucide-monitor', width: undefined },
]

/** @typedef {(typeof viewports)[number]} Viewport */

export const viewportHint = (width) => (width ? `${width}px · ${widthToSize(width)}` : 'Full width')

/**
 * @typedef {object} Options
 * @property {() => Kit} kit
 * @property {() => unknown[]} samples
 * @property {Ref<WidgetDefinition>} definition
 */

/**
 * How the widget is previewed: with which sample data, and at what width. None of it is saved
 * in the definition.
 *
 * @param {Options} options
 */
export function usePreview({ kit, samples, definition }) {
  /** A short label for some data, from the kit, never throwing. */
  function describe(data) {
    try {
      return kit().describe(data)
    } catch {
      return typeof data === 'object' ? 'object' : String(data)
    }
  }

  /** Samples this widget matches, by index into `samples`; all of them when none do. */
  const matchingSamples = computed(() => {
    const all = samples().map((data, index) => ({ data, index }))
    const fits = all.filter(({ data }) => definitionMatches(definition.value, data))
    return fits.length ? fits : all
  })
  const sampleIndex = ref(0)
  watch(
    matchingSamples,
    (fits) => {
      if (!fits.some((f) => f.index === sampleIndex.value)) sampleIndex.value = fits[0]?.index ?? 0
    },
    { immediate: true },
  )
  const sampleOptions = computed(() => matchingSamples.value.map(({ data, index }) => ({ label: describe(data), value: index })))
  const sample = computed(() => samples()[sampleIndex.value])

  const viewport = ref(viewports[1])

  return {
    describe,
    matchingSamples,
    sampleIndex,
    sampleOptions,
    sample,
    viewport,
  }
}
