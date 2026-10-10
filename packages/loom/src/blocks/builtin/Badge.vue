<script>
export const spec = {
  type: 'Badge',
  label: 'Badge',
  icon: 'i-lucide-tag',
  description: 'A small label, like a section or a flash.',
  container: false,
  props: {
    text: { type: 'string', label: 'Text', default: 'Badge', accepts: ['string', 'number'] },
    tone: { type: 'enum', label: 'Tone', options: ['accent', 'neutral', 'alert'], default: 'accent' },
  },
}
</script>

<script setup>
import { blockProps, isBlank, toText } from './shared'

defineOptions({ name: 'LoomBadge' })
const props = defineProps(blockProps(spec))
</script>

<template>
  <span v-if="!isBlank(props.text)" class="w-badge" :class="`is-${toText(props.tone)}`" v-text="toText(props.text)" />
</template>

<style>
.w-badge {
  align-self: flex-start;
  padding: 2px var(--w-space-2);
  border-radius: var(--w-radius-full);
  font-size: var(--w-text-xs);
  font-weight: var(--w-weight-bold);
  letter-spacing: 0.03em;
}

.w-badge.is-accent {
  background: var(--w-accent);
  color: var(--w-accent-contrast);
}

.w-badge.is-neutral {
  background: var(--w-surface);
  color: var(--w-text);
}

.w-badge.is-alert {
  background: var(--w-alert);
  color: #ffffff;
}
</style>
