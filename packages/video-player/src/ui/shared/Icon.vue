<script lang="ts">
import { registerIcons } from '@/icons'
registerIcons()
</script>

<script setup lang="ts">
import { Sigil } from '@munsonlabs/sigil/vue'
defineProps<{ name: string }>()
</script>

<template>
  <Sigil :name="name" library="mlv" class="ml-video-icon" />
</template>

<style scoped>
.ml-video-icon {
  display: contents;
}
</style>
