<script>
export const spec = {
  type: 'Widget',
  label: 'Widget',
  icon: 'i-lucide-layout-template',
  description: 'Another widget from the library, for the data bound to it: the first whose conditions it meets, or the one named.',
  props: {
    data: { type: 'object', label: 'Data', default: null, accepts: ['object'] },
    widget: { type: 'string', label: 'Widget id (blank: the first that matches)', default: '' },
  },
}
</script>

<script setup>
import { computed } from 'vue'
import { injectNesting } from '../../nesting'
import { blockProps, isBlank } from './shared'

/**
 * Draws another `<Widget>` inside this one, with the same kit, context, theme and scheme, picked
 * from the same library. The only block that knows about the widget it's in, through `nesting.js`.
 */
defineOptions({ name: 'LoomWidgetBlock' })
const props = defineProps(blockProps(spec))

const nesting = injectNesting()
const definitions = computed(() => nesting?.definitions ?? [])
/** The named widget, when there is one; otherwise `<Widget>` matches the data against the library. */
const pinned = computed(() => (isBlank(props.widget) ? undefined : definitions.value.find((d) => d.id === props.widget)))
const drawable = computed(
  () => !!nesting && props.data != null && typeof props.data === 'object' && (isBlank(props.widget) ? definitions.value.length > 0 : !!pinned.value),
)
</script>

<template>
  <div v-if="drawable" class="w-widget">
    <component
      :is="nesting.component"
      :kit="nesting.kit"
      :definitions="definitions"
      :definition="pinned"
      :data="props.data"
      :context="nesting.context"
      :theme="nesting.theme"
      :scheme="nesting.scheme"
    />
  </div>
</template>

<style>
.w-widget {
  min-width: 0;
}
</style>
