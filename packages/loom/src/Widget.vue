<script setup>
import { computed, getCurrentInstance, onMounted, onScopeDispose, ref, toRef, watch } from 'vue'
import WidgetNode from './WidgetNode.vue'
import { injectContext, injectKit } from './kit'
import { matchDefinition } from './definitions/match'
import { injectNesting, MAX_DEPTH, provideNesting } from './nesting'
import { createRenderer, provideRenderer } from './renderer'
import { resolveScheme, themeForScheme, usePreferredScheme } from './theme/scheme'
import { tokenVars } from './theme/tokens'
import { applyVariant, BASE_VARIANT, findVariant, matchVariant } from './definitions/variants'

/**
 * Renders a widget definition for one piece of data.
 *
 * - The definition is `definition`, or the first of `definitions` whose `match` holds for the data;
 *   with neither, the `fallback` slot renders.
 * - The variant is the `variant` prop when given (`'base'` forces the base), otherwise the first
 *   whose rule matches the data and the widget's measured width.
 * - It themes the root, then hands the variant's tree to `<WidgetNode>`, which draws it node by node.
 * - Widget blocks inside draw other widgets from the same `definitions`, through `nesting.js`.
 */
defineOptions({ name: 'LoomWidget' })

const props = defineProps({
  /** Falls back to the kit given to `provideKit()`. */
  kit: { type: Object, default: undefined },
  definition: { type: Object, default: undefined },
  /** Picks the first whose `match` holds for the data when `definition` isn't given. Widget blocks inside pick from it too. */
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
// Set when this widget is drawn by a Widget block inside another.
const parent = injectNesting()
const depth = parent ? parent.depth + 1 : 0
const kit = computed(() => {
  const k = props.kit ?? injectedKit
  if (!k) throw new Error('[loom] <Widget> needs a kit: pass `kit` or call provideKit()')
  return k
})

const renderer = createRenderer({
  kit: () => kit.value,
  data: toRef(() => props.data),
  index: toRef(() => props.index),
  context: () => props.context ?? injectedContext,
  nested: depth > 0,
})
provideRenderer(renderer)

const device = usePreferredScheme()
const scheme = computed(() => resolveScheme(props.scheme, device.value))

const definition = computed(() => {
  const def = props.definition ?? (props.definitions ? matchDefinition(props.data, props.definitions) : undefined)
  // A widget inside itself, however deep, would never end; nor would a long enough chain.
  if (def && parent && (depth > MAX_DEPTH || parent.ancestors.includes(def.id))) return undefined
  return def
})

provideNesting({
  component: getCurrentInstance().type,
  depth,
  get ancestors() {
    return [...(parent?.ancestors ?? []), ...(definition.value ? [definition.value.id] : [])]
  },
  get kit() {
    return kit.value
  },
  get definitions() {
    return props.definitions
  },
  get context() {
    return props.context ?? injectedContext
  },
  get theme() {
    return props.theme
  },
  get scheme() {
    return scheme.value
  },
})

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
