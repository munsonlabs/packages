<script setup lang="ts">
import { Sigil } from '@munsonlabs/sigil/vue'
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
  { value: 'top', label: 'positionTop', icon: 'caption-top' },
  { value: 'middle', label: 'positionMiddle', icon: 'caption-middle' },
  { value: 'bottom', label: 'positionBottom', icon: 'caption-bottom' },
] as const
</script>

<template>
  <div class="splice-export">
    <div class="splice-options">
      <label v-if="hasCard" class="splice-chip" :title="labels.endCard">
        <input v-model="withCard" type="checkbox" name="endcard" :disabled="state !== 'editing'" />
        <Sigil name="end-card" library="splice" class="splice-icon" /><span>{{ labels.endCard }}</span>
      </label>
      <label v-if="hasLogo" class="splice-chip" :title="labels.logo">
        <input v-model="withLogo" type="checkbox" name="logo" :disabled="state !== 'editing'" />
        <Sigil name="logo" library="splice" class="splice-icon" /><span>{{ labels.logo }}</span>
      </label>
      <fieldset v-if="hasCaptions" class="splice-position" :disabled="state !== 'editing'">
        <legend>{{ labels.captionPosition }}</legend>
        <label v-for="position in POSITIONS" :key="position.value" class="splice-position__option" :title="labels[position.label]">
          <input v-model="captionPosition" type="radio" name="caption-position" :value="position.value" :aria-label="labels[position.label]" />
          <Sigil :name="position.icon" library="splice" class="splice-icon" />
        </label>
      </fieldset>
    </div>
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
  </div>
</template>

<style scoped>
.splice-export {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.splice-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.splice-chip,
.splice-position__option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border-radius: calc(var(--_radius) / 1.6);
  background: var(--_surface);
  color: var(--_muted);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.splice-chip:has(input:checked),
.splice-position__option:has(input:checked) {
  color: var(--_fg);
  box-shadow: inset 0 0 0 1.5px var(--_accent);
}

.splice-chip:has(input:focus-visible),
.splice-position__option:has(input:focus-visible) {
  outline: 2px solid var(--_focus);
  outline-offset: 2px;
}

.splice-chip:has(input:disabled),
.splice-position:disabled .splice-position__option {
  opacity: 0.5;
  cursor: not-allowed;
}

/* The chip is the control; the input stays for the keyboard and screen readers. */
.splice-chip input,
.splice-position__option input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.splice-position {
  display: inline-flex;
  gap: 2px;
  margin: 0;
  padding: 0;
  border: 0;
}

.splice-position legend {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.splice-position__option {
  padding: 0 8px;
  font-size: var(--splice-icon-size, 18px);
}

.splice-position__option:first-of-type {
  border-radius: calc(var(--_radius) / 1.6) 4px 4px calc(var(--_radius) / 1.6);
}

.splice-position__option:not(:first-of-type, :last-of-type) {
  border-radius: 4px;
}

.splice-position__option:last-of-type {
  border-radius: 4px calc(var(--_radius) / 1.6) calc(var(--_radius) / 1.6) 4px;
}

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
