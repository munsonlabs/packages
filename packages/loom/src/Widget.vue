<script setup>
import { computed } from 'vue'
import WidgetNode from './WidgetNode.vue'
import { injectContext, injectKit } from './kit'
import { createRenderer, provideRenderer } from './renderer'

/**
 * Renders a widget definition for one piece of data.
 *
 * - It sets the definition's `vars` on the root, then hands its tree to `<WidgetNode>`, which
 *   draws it node by node.
 */
defineOptions({ name: 'LoomWidget' })

const props = defineProps({
  /** Falls back to the kit given to `provideKit()`. */
  kit: { type: Object, default: undefined },
  definition: { type: Object, required: true },
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
</script>

<template>
  <div class="w-root" :data-widget="props.definition.id" :style="props.definition.vars">
    <WidgetNode :node="props.definition.root" />
  </div>
</template>
