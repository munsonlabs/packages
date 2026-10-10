<script>
export const spec = {
  type: 'Button',
  label: 'Button',
  icon: 'i-lucide-mouse-pointer-click',
  description: 'A pressable button.',
  container: false,
  props: {
    label: { type: 'string', label: 'Label', default: 'Button', accepts: ['string', 'number'] },
    variant: { type: 'enum', label: 'Variant', options: ['solid', 'outline', 'ghost'], default: 'solid' },
    active: { type: 'boolean', label: 'Active', default: false, accepts: ['boolean'] },
    activeLabel: { type: 'string', label: 'Active label', default: '' },
  },
}
</script>

<script setup>
import { computed } from 'vue'
import { blockProps, toText } from './shared'

defineOptions({ name: 'LoomButton' })
const props = defineProps(blockProps(spec))

const active = computed(() => !!props.active)
const label = computed(() => toText((active.value && props.activeLabel) || props.label))
</script>

<template>
  <button type="button" class="w-button" :class="[`is-${toText(props.variant)}`, { 'is-active': active }]" :aria-pressed="active" v-text="label" />
</template>

<style>
.w-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--w-space-1);
  padding: var(--w-button-padding);
  border: 1px solid var(--w-accent);
  border-radius: var(--w-button-radius);
  font: inherit;
  font-size: var(--w-caption-size);
  font-weight: var(--w-weight-medium);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.w-button.is-solid {
  background: var(--w-accent);
  color: var(--w-accent-contrast);
}

.w-button.is-outline {
  background: transparent;
  color: var(--w-accent);
}

.w-button.is-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--w-accent);
}

.w-button.is-outline.is-active,
.w-button.is-ghost.is-active {
  background: var(--w-accent);
  color: var(--w-accent-contrast);
}
</style>
