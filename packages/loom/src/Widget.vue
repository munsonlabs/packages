<script setup>
import { computed } from 'vue'
import WidgetNode from './WidgetNode.vue'
import { injectContext, injectKit } from './kit'
import { matchDefinition } from './definitions/match'
import { createRenderer, provideRenderer } from './renderer'

/**
 * Renders a widget definition for one piece of data.
 *
 * - The definition is `definition`, or the first of `definitions` whose `match` holds for the data;
 *   with neither, the `fallback` slot renders.
 * - It sets the definition's `vars` on the root, then hands its tree to `<WidgetNode>`, which
 *   draws it node by node.
 */
defineOptions({ name: 'LoomWidget' })

const props = defineProps({
  /** Falls back to the kit given to `provideKit()`. */
  kit: { type: Object, default: undefined },
  definition: { type: Object, default: undefined },
  /** Picks the first whose `match` holds for the data when `definition` isn't given. */
  definitions: { type: Array, default: undefined },
  /** What the widget renders: a story, a product, anything the kit's sources read. */
  data: { type: null, required: true },
  index: { type: Number, default: 0 },
  /** Passed to every source's `setup`; falls back to the context given to `provideKit()`. */
  context: { type: null, required: false },
})

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

/** The definition to draw: the one given, or the first that matches the data. */
const resolved = computed(() => props.definition ?? (props.definitions ? matchDefinition(props.data, props.definitions) : undefined))
</script>

<template>
  <div v-if="resolved" class="w-root" :data-widget="resolved.id" :style="resolved.vars">
    <WidgetNode :node="resolved.root" :locals="{}" />
  </div>
  <slot v-else name="fallback" :data="props.data" />
</template>
