<script>
export const spec = {
  type: 'Stack',
  label: 'Stack',
  icon: 'i-lucide-layout-list',
  description: 'Lays its children out in a row or column.',
  container: true,
  props: {
    direction: { type: 'enum', label: 'Direction', options: ['column', 'row'], default: 'column' },
    gap: { type: 'string', label: 'Gap', default: 'var(--w-gap)' },
    align: { type: 'enum', label: 'Align', options: ['stretch', 'start', 'center', 'end'], default: 'stretch' },
    justify: { type: 'enum', label: 'Justify', options: ['start', 'center', 'end', 'space-between'], default: 'start' },
    wrap: { type: 'boolean', label: 'Wrap', default: false },
  },
}
</script>

<script setup>
import { blockProps, toFlexAlign } from './shared'

defineOptions({ name: 'LoomStack' })
const props = defineProps(blockProps(spec))
</script>

<template>
  <div
    class="w-stack"
    :style="{
      flexDirection: props.direction,
      gap: props.gap,
      alignItems: toFlexAlign(props.align),
      justifyContent: toFlexAlign(props.justify),
      flexWrap: props.wrap ? 'wrap' : undefined,
    }"
  >
    <slot />
  </div>
</template>

<style>
.w-stack {
  display: flex;
  min-width: 0;
}
</style>
