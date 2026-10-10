<script>
export const spec = {
  type: 'Carousel',
  label: 'Carousel',
  icon: 'i-lucide-gallery-horizontal',
  description: 'A row of its children that scrolls sideways and snaps to each one.',
  container: true,
  props: {
    itemWidth: { type: 'string', label: 'Item width', default: '80%' },
    gap: { type: 'string', label: 'Gap', default: 'var(--w-gap)', tokenScale: 'space' },
    snap: { type: 'boolean', label: 'Snap', default: true },
  },
}
</script>

<script setup>
import { blockProps } from './shared'

defineOptions({ name: 'LoomCarousel' })
const props = defineProps(blockProps(spec))
</script>

<template>
  <div class="w-carousel" :class="{ 'is-snapping': props.snap }" :style="{ gap: props.gap, '--loom-item-width': props.itemWidth }">
    <slot />
  </div>
</template>
