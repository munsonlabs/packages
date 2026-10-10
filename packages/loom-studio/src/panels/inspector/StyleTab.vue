<script setup>
import StyleEditor from '../StyleEditor.vue'
import { tabEmits, tabProps } from './shared'

/** The element's own CSS. */
defineProps(tabProps)
const emit = defineEmits(tabEmits)

function setStyle(style) {
  emit('edit', (node) => {
    if (Object.keys(style).length) node.style = style
    else delete node.style
  })
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-xs text-muted">Inline CSS. Spacing, colour, radius and type pick from the theme's tokens.</p>
    <StyleEditor :entries="node.style ?? {}" @change="setStyle" />
  </div>
</template>
