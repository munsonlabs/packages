<script setup lang="ts">
import type { EditorLabels, EditorState } from '@/types/editor'
import type { CaptionPosition } from '@/types/splice'

defineProps<{
  state: EditorState
  progress: number
  hasCard: boolean
  hasLogo: boolean
  hasCaptions: boolean
  labels: EditorLabels
}>()

const emit = defineEmits<{ export: []; cancel: [] }>()

const withCard = defineModel<boolean>('withCard', { required: true })
const withLogo = defineModel<boolean>('withLogo', { required: true })
const captionPosition = defineModel<CaptionPosition>('captionPosition', { required: true })

const POSITIONS = [
  { value: 'top', label: 'positionTop' },
  { value: 'middle', label: 'positionMiddle' },
  { value: 'bottom', label: 'positionBottom' },
] as const
</script>

<template>
  <div class="splice-export">
    <label v-if="hasCard" class="splice-toggle">
      <input v-model="withCard" type="checkbox" name="endcard" :disabled="state !== 'editing'" />
      <span>{{ labels.endCard }}</span>
    </label>
    <label v-if="hasLogo" class="splice-toggle">
      <input v-model="withLogo" type="checkbox" name="logo" :disabled="state !== 'editing'" />
      <span>{{ labels.logo }}</span>
    </label>
    <fieldset v-if="hasCaptions" class="splice-position" :disabled="state !== 'editing'">
      <legend>{{ labels.captionPosition }}</legend>
      <label v-for="position in POSITIONS" :key="position.value" class="splice-position__option">
        <input v-model="captionPosition" type="radio" name="caption-position" :value="position.value" />
        <span>{{ labels[position.label] }}</span>
      </label>
    </fieldset>
    <div v-if="state === 'exporting'" class="splice-progress">
      <div class="splice-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(progress * 100)">
        <span :style="{ width: `${Math.round(progress * 100)}%` }" />
      </div>
      <button type="button" class="splice-button splice-cancel" @click="emit('cancel')">{{ labels.cancel }}</button>
    </div>
    <div v-else class="splice-actions">
      <button type="button" class="splice-button splice-button--primary splice-export-button" :disabled="state !== 'editing'" @click="emit('export')">
        {{ labels.export }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.splice-export {
  display: grid;
  gap: 14px;
}

.splice-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.splice-toggle input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--_accent);
}

.splice-position {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin: 0;
  padding: 0;
  border: 0;
}

.splice-position legend {
  float: left;
  padding: 0;
  margin-right: 6px;
}

.splice-position__option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 99px;
  background: var(--_surface);
  cursor: pointer;
}

.splice-position__option:has(input:checked) {
  background: var(--_accent);
  color: var(--_accent-fg);
}

/* The pill is the control; the radio stays for keyboard and screen readers. */
.splice-position__option input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.splice-position__option:has(input:focus-visible) {
  outline: 3px solid var(--_focus);
  outline-offset: 2px;
}

.splice-position:disabled .splice-position__option {
  opacity: 0.5;
  cursor: not-allowed;
}

.splice-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.splice-bar {
  flex: 1;
  height: 8px;
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
