<script>
export const spec = {
  type: 'Rating',
  label: 'Rating',
  icon: 'i-lucide-star',
  description: 'Stars out of a maximum, from a number.',
  container: false,
  clickable: true,
  props: {
    value: { type: 'number', label: 'Value', default: 0, accepts: ['number'] },
    max: { type: 'number', label: 'Out of', default: 5 },
    showValue: { type: 'boolean', label: 'Show the number', default: false },
  },
}
</script>

<script setup>
import { computed } from 'vue'
import { blockProps } from './shared'

/** Stars filled to the value, partly for a fraction: each star's fill is a CSS variable. */
defineOptions({ name: 'LoomRating' })
const props = defineProps(blockProps(spec))

const max = computed(() => Math.max(1, Math.round(Number(props.max) || 5)))
const value = computed(() => Math.min(max.value, Math.max(0, Number(props.value) || 0)))
const fill = (i) => `${Math.min(1, Math.max(0, value.value - i)) * 100}%`
</script>

<template>
  <span class="w-rating" role="img" :aria-label="`${value} out of ${max}`">
    <span v-for="i in max" :key="i" class="w-rating-star" :style="{ '--loom-fill': fill(i - 1) }">★</span>
    <span v-if="props.showValue" class="w-rating-value" v-text="String(Math.round(value * 10) / 10)" />
  </span>
</template>

<style>
.w-rating {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  font-size: var(--w-body-size);
  line-height: 1;
}

/* Each star fills to --loom-fill (an internal variable, not a token), so 3.5 shows three and a half. */
.w-rating-star {
  background: linear-gradient(90deg, var(--w-rating) var(--loom-fill), var(--w-border) var(--loom-fill));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.w-rating-value {
  margin-left: var(--w-space-1);
  color: var(--w-muted);
  font-size: var(--w-caption-size);
}
</style>
