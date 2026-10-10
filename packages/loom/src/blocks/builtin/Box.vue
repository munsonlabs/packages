<script>
export const spec = {
  type: 'Box',
  label: 'Box',
  icon: 'i-lucide-square',
  description: 'A surface: a background, padding, radius and shadow around its children.',
  container: true,
  clickable: true,
  props: {
    background: { type: 'string', label: 'Background', default: 'var(--w-surface)' },
    padding: { type: 'string', label: 'Padding', default: 'var(--w-space-3)' },
    radius: { type: 'string', label: 'Radius', default: 'var(--w-radius-md)' },
    shadow: { type: 'string', label: 'Shadow', default: 'var(--w-shadow-none)' },
    border: { type: 'boolean', label: 'Border', default: false },
    direction: { type: 'enum', label: 'Direction', options: ['column', 'row'], default: 'column' },
    gap: { type: 'string', label: 'Gap', default: 'var(--w-gap)' },
    align: { type: 'enum', label: 'Align', options: ['stretch', 'start', 'center', 'end'], default: 'stretch' },
  },
}
</script>

<script setup>
import { blockProps, toFlexAlign } from './shared'

defineOptions({ name: 'LoomBox' })
const props = defineProps(blockProps(spec))
</script>

<template>
  <div
    class="w-box"
    :style="{
      flexDirection: props.direction,
      gap: props.gap,
      alignItems: toFlexAlign(props.align),
      background: props.background,
      padding: props.padding,
      borderRadius: props.radius,
      boxShadow: props.shadow,
      ...(props.border ? { borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--w-border)' } : {}),
    }"
  >
    <slot />
  </div>
</template>

<style>
.w-box {
  display: flex;
  min-width: 0;
}
</style>
