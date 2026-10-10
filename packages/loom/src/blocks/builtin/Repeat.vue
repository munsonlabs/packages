<script>
/**
 * The `repeat.*` fields: where the current item sits in its Repeat, for numbering rows or
 * styling the first and last. Editors list them from here (`definitions/paths.js`), and
 * `repeatPosition` builds them for each item.
 */
export const positionFields = {
  index: { type: 'number', description: 'Position from 0' },
  number: { type: 'number', description: 'Position from 1' },
  first: { type: 'boolean', description: 'The first item' },
  last: { type: 'boolean', description: 'The last item' },
  count: { type: 'number', description: 'How many items are shown' },
}

/** Item `index` of `count`'s `positionFields`. */
export const repeatPosition = (index, count) => ({ index, number: index + 1, first: index === 0, last: index === count - 1, count })

/** @typedef {ReturnType<typeof repeatPosition>} RepeatPosition */

export const spec = {
  type: 'Repeat',
  label: 'Repeat',
  icon: 'i-lucide-repeat',
  description: 'Renders its children once per item of a list, with the item in scope as `item`.',
  container: true,
  props: {
    items: { type: 'string', label: 'Items', default: '', accepts: ['list'] },
    limit: { type: 'number', label: 'Limit', default: 0 },
    layout: { type: 'enum', label: 'Layout', options: ['stack', 'grid', 'carousel'], default: 'stack' },
    direction: { type: 'enum', label: 'Direction (stack)', options: ['column', 'row'], default: 'column' },
    columns: { type: 'number', label: 'Columns (grid)', default: 2 },
    itemWidth: { type: 'string', label: 'Item width (carousel)', default: '80%' },
    gap: { type: 'string', label: 'Gap', default: 'var(--w-gap)' },
  },
}
</script>

<script setup>
import { computed } from 'vue'
import { blockProps, gridColumns } from './shared'

/**
 * Renders its default slot once per item, passing `{ item, repeat }`: what `item.*` and
 * `repeat.*` paths read inside it. `repeat` is a `RepeatPosition` (see above).
 */
defineOptions({ name: 'LoomRepeat' })
const props = defineProps(blockProps(spec))

const items = computed(() => {
  const all = Array.isArray(props.items) ? props.items : []
  return Number(props.limit) > 0 ? all.slice(0, Number(props.limit)) : all
})
const layout = computed(() => (props.layout === 'grid' || props.layout === 'carousel' ? props.layout : 'stack'))
const style = computed(() =>
  layout.value === 'grid'
    ? { ...gridColumns(props.columns, ''), gap: props.gap }
    : layout.value === 'carousel'
      ? { gap: props.gap, '--loom-item-width': props.itemWidth }
      : { flexDirection: props.direction, gap: props.gap },
)
const position = (i) => repeatPosition(i, items.value.length)
</script>

<template>
  <div v-if="items.length" class="w-repeat" :class="[`is-${layout}`, { 'is-snapping': layout === 'carousel' }]" :style="style">
    <div v-for="(item, i) in items" :key="i" class="w-repeat-item">
      <slot :item="item" :repeat="position(i)" />
    </div>
  </div>
</template>

<style>
.w-repeat-item {
  display: contents;
}
</style>
