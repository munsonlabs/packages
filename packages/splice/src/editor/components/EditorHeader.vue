<script setup lang="ts">
import { Sigil } from '@munsonlabs/sigil/vue'
import { useLabels } from '../composables'

defineProps<{ titleId: string }>()

const emit = defineEmits<{ close: [] }>()

const labels = useLabels()
</script>

<template>
  <header class="splice-header">
    <h2 :id="titleId" class="splice-title">{{ labels.title }}</h2>
    <button type="button" class="splice-button splice-close" :aria-label="labels.close" @click="emit('close')">
      <Sigil name="close" library="mlv" class="splice-icon" />
    </button>
  </header>
</template>

<style scoped>
.splice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px 8px 14px;
  border-bottom: 1px solid var(--_surface);
}

.splice-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.splice-header .splice-close {
  width: 32px;
  padding: 0;
  font-size: var(--splice-icon-size, 18px);
}

.splice-header .splice-close :deep(.splice-icon svg) {
  width: 1em;
  height: 1em;
}
</style>
