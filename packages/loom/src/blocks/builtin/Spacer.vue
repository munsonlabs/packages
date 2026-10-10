<script>
export const spec = {
  type: 'Spacer',
  label: 'Spacer',
  icon: 'i-lucide-move-vertical',
  description: 'Fixed space, or fills the remaining space when grow is on.',
  container: false,
  props: {
    size: { type: 'string', label: 'Size', default: 'var(--w-space-2)' },
    grow: { type: 'boolean', label: 'Grow', default: false },
  },
}
</script>

<script setup>
import { blockProps, toText } from './shared'

defineOptions({ name: 'LoomSpacer' })
const props = defineProps(blockProps(spec))
</script>

<template>
  <div class="w-spacer" :style="props.grow ? { flex: '1 1 auto' } : { flex: `0 0 ${toText(props.size)}` }" />
</template>
