<script lang="ts">
import { registerIcons } from '@/icons'
registerIcons()
</script>

<script setup lang="ts">
import { Sigil } from '@munsonlabs/sigil/vue'
defineProps<{ name: string }>()
</script>

<template>
  <Sigil :name="name" library="mlv" class="mlv-icon" />
</template>

<style scoped>
.mlv-icon {
  display: contents;
}
</style>
