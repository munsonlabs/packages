<script setup>
/** The demo kit's own block. It gets its props resolved; the node's attributes fall through to the root. */
defineProps({ text: { type: String, default: '' } })
</script>

<template>
  <mark v-if="text" style="padding: 0 4px; border-radius: 3px; background: #fde68a; color: #1c1917">{{ text }}</mark>
</template>
