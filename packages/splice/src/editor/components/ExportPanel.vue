<script setup lang="ts">
import { computed } from 'vue'
import { Sigil } from '@munsonlabs/sigil/vue'
import { useLabels } from '../composables'
import ExportButton from './ExportButton.vue'
import SegmentedControl from './SegmentedControl.vue'
import type { EditorState } from '@/types/editor'
import type { CaptionPosition, CropOptions } from '@/types/splice'
import type { SegmentedOption } from '@/types/internal'

const props = defineProps<{
  state: EditorState
  progress: number
  hasCard: boolean
  hasLogo: boolean
  hasCaptions: boolean
  aspects: CropOptions['aspect'][]
}>()

const emit = defineEmits<{ export: []; cancel: [] }>()

const withCard = defineModel<boolean>('withCard', { required: true })
const withLogo = defineModel<boolean>('withLogo', { required: true })
const captionPosition = defineModel<CaptionPosition>('captionPosition', { required: true })
const aspect = defineModel<CropOptions['aspect']>('aspect', { required: true })

const ASPECT_ICONS: Record<string, string> = {
  '9:16': 'aspect-portrait',
  '4:5': 'aspect-post',
  '1:1': 'aspect-square',
}

const labels = useLabels()
const isLocked = computed(() => props.state !== 'editing')

const shapes = computed<SegmentedOption<CropOptions['aspect']>[]>(() =>
  props.aspects.map((value) => ({ value, label: value, icon: ASPECT_ICONS[value] })),
)

const positions = computed<SegmentedOption<CaptionPosition>[]>(() => [
  { value: 'top', label: labels.value.positionTop, icon: 'caption-top' },
  { value: 'middle', label: labels.value.positionMiddle, icon: 'caption-middle' },
  { value: 'bottom', label: labels.value.positionBottom, icon: 'caption-bottom' },
])
</script>

<template>
  <div class="splice-export">
    <div class="splice-options">
      <label v-if="hasCard" class="splice-option splice-chip" :title="labels.endCard">
        <input v-model="withCard" type="checkbox" name="endcard" :disabled="isLocked" />
        <Sigil name="end-card" library="splice" class="splice-icon" /><span>{{ labels.endCard }}</span>
      </label>
      <label v-if="hasLogo" class="splice-option splice-chip" :title="labels.logo">
        <input v-model="withLogo" type="checkbox" name="logo" :disabled="isLocked" />
        <Sigil name="logo" library="splice" class="splice-icon" /><span>{{ labels.logo }}</span>
      </label>
      <SegmentedControl
        v-if="aspects.length > 1"
        v-model="aspect"
        class="splice-shape"
        name="aspect"
        :legend="labels.shape"
        :options="shapes"
        :disabled="isLocked"
      />
      <SegmentedControl
        v-if="hasCaptions"
        v-model="captionPosition"
        class="splice-position"
        name="caption-position"
        :legend="labels.captionPosition"
        :options="positions"
        :disabled="isLocked"
      />
    </div>
    <ExportButton :state="state" :progress="progress" @export="emit('export')" @cancel="emit('cancel')" />
  </div>
</template>

<style scoped>
.splice-export,
.splice-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.splice-export {
  gap: 8px;
}

.splice-options {
  gap: 6px;
}
</style>
