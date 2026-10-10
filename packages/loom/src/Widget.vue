<script setup>
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import WidgetNode from './WidgetNode.vue'
import { injectContext, injectKit, matchDefinition } from './kit'
import { createRenderer, provideRenderer } from './renderer'
import { resolveScheme, themeForScheme, usePreferredScheme } from './theme/scheme'
import { tokenVars } from './theme/tokens'
import { applyVariant, BASE_VARIANT, findVariant, matchVariant } from './definitions/variants'

/**
 * Renders a widget definition for one piece of data.
 *
 * - The definition is `definition`, or the first of `definitions` whose kind matches the data;
 *   with neither, the `fallback` slot renders.
 * - The variant is the `variant` prop when given (`'base'` forces the base), otherwise the first
 *   whose rule matches the data and the widget's measured width.
 * - It themes the root, then hands the variant's tree to `<WidgetNode>`, which draws it node by node.
 */
defineOptions({ name: 'LoomWidget' })

const props = defineProps({
  /** Falls back to the kit given to `provideKit()`. */
  kit: { type: Object, default: undefined },
  definition: { type: Object, default: undefined },
  /** Picks a definition by kind when `definition` isn't given. */
  definitions: { type: Array, default: undefined },
  /** What the widget renders: a story, a product, anything the kit's sources read. */
  data: { type: null, required: true },
  index: { type: Number, default: 0 },
  /** Passed to every source's `setup`; falls back to the context given to `provideKit()`. */
  context: { type: null, required: false },
  /** Pins a variant by id, or `'base'`. Omit to pick by the variants' rules. */
  variant: { type: String, default: undefined },
  /** One of the kit's themes by id. Defaults to the kit's first. */
  theme: { type: String, default: undefined },
  /**
   * `auto` follows the device's light or dark setting; `light` and `dark` force one, e.g. from
   * the host app's own setting. The theme switches to its counterpart for that scheme.
   */
  scheme: { type: String, default: 'auto' },
})

/** `variant`: the variant being rendered, `'base'` when none applies. */
const emit = defineEmits(['variant'])

const injectedKit = injectKit()
const injectedContext = injectContext()
const kit = computed(() => {
  const k = props.kit ?? injectedKit
  if (!k) throw new Error('[loom] <Widget> needs a kit: pass `kit` or call provideKit()')
  return k
})

// What sources get. Getters, so composables that read them inside `computed` stay reactive.
const sourceContext = {
  get data() {
    return props.data
  },
  get index() {
    return props.index
  },
  get context() {
    return props.context ?? injectedContext
  },
}
const renderer = createRenderer({ kit: () => kit.value, sourceContext })
provideRenderer(renderer)

const device = usePreferredScheme()
const scheme = computed(() => resolveScheme(props.scheme, device.value))

const definition = computed(() => props.definition ?? (props.definitions ? matchDefinition(kit.value, props.data, props.definitions) : undefined))

// The widget's own width, for variant rules by size.
const el = ref()
const width = ref()
let observer
onMounted(() => {
  if (!el.value || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(([entry]) => (width.value = entry.contentRect.width))
  observer.observe(el.value)
})
onScopeDispose(() => observer?.disconnect())

const active = computed(() => {
  const def = definition.value
  if (!def) return BASE_VARIANT
  if (props.variant) return findVariant(def, props.variant)?.id ?? BASE_VARIANT
  return matchVariant(def, { width: width.value, scheme: scheme.value, readValue: (path) => renderer.readValue(path, {}) }) ?? BASE_VARIANT
})
watch(active, (id) => emit('variant', id), { immediate: true })

/** The definition with the active variant applied: what's drawn. */
const resolved = computed(() => definition.value && applyVariant(definition.value, active.value))

const theme = computed(() => themeForScheme(kit.value, props.theme, scheme.value))
// Theme, then the definition's vars, then the variant's (already merged into `vars`).
// `color-scheme` lets any value inside use CSS's light-dark(light, dark) and get the right half.
const style = computed(() => ({ 'color-scheme': scheme.value, ...tokenVars(theme.value.values), ...tokenVars(resolved.value?.vars) }))
</script>

<template>
  <div
    v-if="resolved"
    ref="el"
    class="w-root"
    :data-widget="resolved.id"
    :data-variant="active"
    :data-theme="theme.id"
    :data-scheme="scheme"
    :style="style"
  >
    <WidgetNode :node="resolved.root" :locals="{}" />
  </div>
  <slot v-else name="fallback" :data="props.data" />
</template>
