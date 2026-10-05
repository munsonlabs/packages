<script setup lang="ts">
import type { PickerLabels } from '@/registries/pickerDefaults'
import type { CaptionPosition, PickerState } from '@/ui/picker/types'

defineProps<{
  state: PickerState
  progress: number
  hasLogo: boolean
  hasCaptions: boolean
  labels: PickerLabels
  /** The last export failed in a way trying again may fix: the button says so. */
  retry?: boolean
}>()

const emit = defineEmits<{ export: []; cancel: [] }>()

const withCard = defineModel<boolean>('withCard', { required: true })
const withLogo = defineModel<boolean>('withLogo', { required: true })
const captionPosition = defineModel<CaptionPosition>('captionPosition', { required: true })
const POSITIONS = ['top', 'middle', 'bottom'] as const
const positionLabel = { top: 'positionTop', middle: 'positionMiddle', bottom: 'positionBottom' } as const
</script>

<template>
  <div class="reel-export">
    <label class="reel-toggle">
      <input v-model="withCard" type="checkbox" name="endcard" :disabled="state !== 'editing'" />
      <span>{{ labels.endCard }}</span>
    </label>
    <label v-if="hasLogo" class="reel-toggle">
      <input v-model="withLogo" type="checkbox" name="logo" :disabled="state !== 'editing'" />
      <span>{{ labels.logo }}</span>
    </label>
    <fieldset v-if="hasCaptions" class="reel-position" :disabled="state !== 'editing'">
      <legend>{{ labels.captionPosition }}</legend>
      <label v-for="position in POSITIONS" :key="position" class="reel-position__option">
        <input v-model="captionPosition" type="radio" name="caption-position" :value="position" />
        <span>{{ labels[positionLabel[position]] }}</span>
      </label>
    </fieldset>
    <div v-if="state === 'exporting'" class="reel-progress">
      <div class="reel-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(progress * 100)">
        <span :style="{ width: `${Math.round(progress * 100)}%` }" />
      </div>
      <button type="button" class="reel-button reel-cancel" @click="emit('cancel')">{{ labels.cancel }}</button>
    </div>
    <div v-else class="reel-actions">
      <button type="button" class="reel-button reel-button--primary reel-export-button" :disabled="state !== 'editing'" @click="emit('export')">
        {{ retry ? labels.retry : labels.export }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.reel-export {
  display: grid;
  gap: 14px;
}

.reel-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.reel-toggle input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--_accent);
}

.reel-position {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin: 0;
  padding: 0;
  border: 0;
}

.reel-position legend {
  float: left;
  padding: 0;
  margin-right: 6px;
}

.reel-position__option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 99px;
  background: var(--_surface);
  cursor: pointer;
}

.reel-position__option:has(input:checked) {
  background: var(--_accent);
  color: var(--_accent-fg);
}

.reel-position__option input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.reel-position__option:has(input:focus-visible) {
  outline: 3px solid var(--_focus);
  outline-offset: 2px;
}

.reel-position:disabled .reel-position__option {
  opacity: 0.5;
  cursor: not-allowed;
}

.reel-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reel-bar {
  flex: 1;
  height: 8px;
  border-radius: 99px;
  background: var(--_surface);
  overflow: hidden;
}

.reel-bar span {
  display: block;
  height: 100%;
  background: var(--_accent);
  transition: width 120ms linear;
}
</style>
