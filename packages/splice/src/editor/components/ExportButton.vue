<script setup lang="ts">
import { Sigil } from '@munsonlabs/sigil/vue'
import { useLabels } from '../composables'
import type { EditorState } from '@/types/editor'

defineProps<{
  state: EditorState
  progress: number
}>()

const emit = defineEmits<{ export: []; cancel: [] }>()

const labels = useLabels()
</script>

<template>
  <div v-if="state === 'exporting'" class="splice-progress">
    <div class="splice-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(progress * 100)">
      <span :style="{ width: `${Math.round(progress * 100)}%` }" />
    </div>
    <button type="button" class="splice-button splice-cancel" @click="emit('cancel')">
      <Sigil name="cancel" library="splice" class="splice-icon" /><span>{{ labels.cancel }}</span>
    </button>
  </div>
  <button
    v-else
    type="button"
    class="splice-button splice-button--primary splice-export-button"
    :disabled="state !== 'editing'"
    @click="emit('export')"
  >
    <Sigil name="scissors" library="splice" class="splice-icon" /><span>{{ labels.export }}</span>
  </button>
</template>

<style scoped>
.splice-export-button,
.splice-progress {
  margin-left: auto;
}

.splice-progress {
  display: flex;
  flex: 1 1 200px;
  align-items: center;
  gap: 8px;
}

.splice-bar {
  flex: 1;
  height: 6px;
  border-radius: 99px;
  background: var(--_surface);
  overflow: hidden;
}

.splice-bar span {
  display: block;
  height: 100%;
  background: var(--_accent);
  transition: width 120ms linear;
}
</style>
