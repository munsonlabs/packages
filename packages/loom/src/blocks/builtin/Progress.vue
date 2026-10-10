<script>
export const spec = {
  type: 'Progress',
  label: 'Progress',
  icon: 'i-lucide-chart-no-axes-gantt',
  description: 'A bar showing a value out of a maximum.',
  container: false,
  props: {
    value: { type: 'number', label: 'Value', default: 0, accepts: ['number'] },
    max: { type: 'number', label: 'Out of', default: 100 },
    tone: { type: 'enum', label: 'Tone', options: ['accent', 'success', 'alert'], default: 'accent' },
    label: { type: 'string', label: 'Label', default: '', accepts: ['string', 'number'] },
  },
}
</script>

<script setup>
import { computed } from 'vue'
import { blockProps, isBlank, toText } from './shared'

defineOptions({ name: 'LoomProgress' })
const props = defineProps(blockProps(spec))

const max = computed(() => (Number(props.max) > 0 ? Number(props.max) : 100))
const value = computed(() => Math.min(max.value, Math.max(0, Number(props.value) || 0)))
const tone = computed(() => (props.tone === 'success' || props.tone === 'alert' ? props.tone : 'accent'))
</script>

<template>
  <div class="w-progress" :class="`is-${tone}`">
    <span v-if="!isBlank(props.label)" class="w-progress-label" v-text="toText(props.label)" />
    <div class="w-progress-track" role="progressbar" :aria-valuenow="value" aria-valuemin="0" :aria-valuemax="max">
      <div class="w-progress-bar" :style="{ width: `${(value / max) * 100}%` }" />
    </div>
  </div>
</template>

<style>
.w-progress {
  display: flex;
  flex-direction: column;
  gap: var(--w-space-1);
}

.w-progress-label {
  color: var(--w-muted);
  font-size: var(--w-caption-size);
}

.w-progress-track {
  height: var(--w-progress-height);
  overflow: hidden;
  border-radius: var(--w-radius-full);
  background: var(--w-surface);
}

.w-progress-bar {
  height: 100%;
  border-radius: inherit;
  background: var(--w-accent);
  transition: width 0.3s;
}

.w-progress.is-success .w-progress-bar {
  background: var(--w-success);
}

.w-progress.is-alert .w-progress-bar {
  background: var(--w-alert);
}
</style>
