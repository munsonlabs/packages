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
    direction: { type: 'enum', label: 'Direction', options: ['column', 'row'], default: 'column' },
    gap: { type: 'string', label: 'Gap', default: 'var(--w-gap)' },
  },
}
</script>

<script setup>
import { computed } from 'vue'
import { blockProps } from './shared'

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
const position = (i) => repeatPosition(i, items.value.length)
</script>

<template>
  <div v-if="items.length" class="w-repeat" :style="{ flexDirection: props.direction, gap: props.gap }">
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
