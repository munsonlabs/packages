<script>
export const spec = {
  type: 'Grid',
  label: 'Grid',
  icon: 'i-lucide-layout-grid',
  description: 'Lays its children out in columns: a fixed number, or as many as fit a minimum width.',
  container: true,
  props: {
    columns: { type: 'number', label: 'Columns', default: 2 },
    minWidth: { type: 'string', label: 'Or fit columns of at least', default: '' },
    gap: { type: 'string', label: 'Gap', default: 'var(--w-gap)' },
    align: { type: 'enum', label: 'Align', options: ['stretch', 'start', 'center', 'end'], default: 'stretch' },
  },
}
</script>

<script setup>
import { blockProps, gridColumns, toFlexAlign } from './shared'

defineOptions({ name: 'LoomGrid' })
const props = defineProps(blockProps(spec))
</script>

<template>
  <div class="w-grid" :style="{ ...gridColumns(props.columns, props.minWidth), gap: props.gap, alignItems: toFlexAlign(props.align) }">
    <slot />
  </div>
</template>
