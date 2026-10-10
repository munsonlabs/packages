<script setup>
import { computed } from 'vue'
import OverrideMark from '../OverrideMark.vue'
import StyleEditor from '../StyleEditor.vue'
import { overridesIn, tabEmits, tabProps } from './shared'

/** The element's own CSS. */
const props = defineProps(tabProps)
const emit = defineEmits(tabEmits)

const overridden = computed(() => overridesIn(props.variant?.override))

function setStyle(style) {
  emit('edit', (node) => {
    if (Object.keys(style).length) node.style = style
    else delete node.style
  })
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <p class="text-xs text-muted">Inline CSS. Spacing, colour, radius and type pick from the theme's tokens.</p>
      <OverrideMark v-if="variant && overridden.style" :variant="variant.label" @reset="emit('reset', { field: 'style' })" />
    </div>
    <StyleEditor :entries="node.style ?? {}" @change="setStyle" />
  </div>
</template>
