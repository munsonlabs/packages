import { computed, ref, shallowRef, watch } from 'vue'
import { BASE_VARIANT, definitionMatches, themeForScheme, usePreferredScheme, widthToSize } from '@munsonlabs/loom/editor'

/** The canvas widths the preview offers. */
export const viewports = [
  { label: 'Narrow', icon: 'i-lucide-panel-left', width: 280 },
  { label: 'Phone', icon: 'i-lucide-smartphone', width: 375 },
  { label: 'Tablet', icon: 'i-lucide-tablet', width: 600 },
  { label: 'Fill', icon: 'i-lucide-monitor', width: undefined },
]

/** @typedef {(typeof viewports)[number]} Viewport */

export const viewportHint = (width) => (width ? `${width}px · ${widthToSize(width)}` : 'Full width')

export const schemeOptions = {
  auto: { label: 'Auto', icon: 'i-lucide-sun-moon', next: 'light' },
  light: { label: 'Light', icon: 'i-lucide-sun', next: 'dark' },
  dark: { label: 'Dark', icon: 'i-lucide-moon', next: 'auto' },
}

/**
 * @typedef {object} Options
 * @property {() => Kit} kit
 * @property {() => unknown[]} samples
 * @property {Ref<WidgetDefinition>} definition
 */

/**
 * How the widget is previewed: with which sample data, at what width, in which theme and
 * colour scheme, whether its variants' rules pick the variant, and whether clicks edit or run
 * the widget's actions. None of it is saved in the definition.
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

  // Shallow, so it holds the entry from `viewports` itself and `viewport === vp` holds.
  const viewport = shallowRef(viewports[1])

  /** Off: the preview shows the variant being edited. On: its rules pick one, as in production. */
  const followRules = ref(false)
  /** The variant the rules picked, reported by the previewed widget. */
  const matchedVariant = ref(BASE_VARIANT)

  /** Which of the kit's themes the preview uses. Themes belong to the kit; a widget only overrides tokens. */
  const themeId = ref(kit().themes[0]?.id)
  /** A theme another names as its dark counterpart is reached through the scheme switch, not listed. */
  const themeOptions = computed(() =>
    kit()
      .themes.filter((t) => !kit().themes.some((other) => other.dark === t.id))
      .map((t) => ({ label: t.label, value: t.id })),
  )

  /** Light, dark, or the device's: the preview's colour scheme, independent of the studio's own. */
  const previewScheme = ref('auto')
  const device = usePreferredScheme()
  const activeScheme = computed(() => (previewScheme.value === 'auto' ? device.value : previewScheme.value))
  const cycleScheme = () => (previewScheme.value = schemeOptions[previewScheme.value].next)

  /** The theme the preview renders with. */
  const theme = computed(() => themeForScheme(kit(), themeId.value, activeScheme.value))
  /** The theme panel reads light first, with the dark counterpart (if any) beside it. */
  const panelTheme = computed(() => themeForScheme(kit(), themeId.value, 'light'))
  const darkTheme = computed(() => {
    const dark = themeForScheme(kit(), themeId.value, 'dark')
    return dark.id === panelTheme.value.id ? undefined : dark
  })

  /** `edit`: clicks select. `interact` (Try): clicks run the widget's actions. */
  const mode = ref('edit')

  /** What the canvas shows side by side: one widget, or a frame per width, variant, sample or scheme. See `frames.js`. */
  const frameMode = ref('one')

  return {
    describe,
    matchingSamples,
    sampleIndex,
    sampleOptions,
    sample,
    viewport,
    followRules,
    matchedVariant,
    themeId,
    themeOptions,
    previewScheme,
    activeScheme,
    cycleScheme,
    theme,
    panelTheme,
    darkTheme,
    mode,
    frameMode,
  }
}
