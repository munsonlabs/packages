<script setup lang="ts" generic="T extends string">
import { Sigil } from '@munsonlabs/sigil/vue'
import type { SegmentedOption } from '@/types/internal'

defineProps<{
  name: string
  legend: string
  options: SegmentedOption<T>[]
  disabled: boolean
}>()

const value = defineModel<T>({ required: true })
</script>

<template>
  <fieldset class="splice-segmented" :disabled="disabled">
    <legend>{{ legend }}</legend>
    <label v-for="option in options" :key="option.value" class="splice-option splice-segmented__option" :title="option.label">
      <input v-model="value" type="radio" :name="name" :value="option.value" :aria-label="option.label" />
      <Sigil v-if="option.icon" :name="option.icon" library="splice" class="splice-icon" />
      <span v-else class="splice-segmented__text">{{ option.label }}</span>
    </label>
  </fieldset>
</template>

<style scoped>
.splice-segmented {
  display: inline-flex;
  gap: 2px;
  margin: 0;
  padding: 0;
  border: 0;
}

.splice-segmented legend {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.splice-segmented__option {
  padding: 0 8px;
  font-size: var(--splice-icon-size, 18px);
}

.splice-segmented__option:first-of-type {
  border-radius: calc(var(--_radius) / 1.6) 4px 4px calc(var(--_radius) / 1.6);
}

.splice-segmented__option:not(:first-of-type, :last-of-type) {
  border-radius: 4px;
}

.splice-segmented__option:last-of-type {
  border-radius: 4px calc(var(--_radius) / 1.6) calc(var(--_radius) / 1.6) 4px;
}

.splice-segmented__text {
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
</style>
