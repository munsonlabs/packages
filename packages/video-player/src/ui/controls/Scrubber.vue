<script setup lang="ts">
import { useScrubber } from '@/ui/controls/useScrubber'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/ui/controls/useResolvedPlayer'
import { computed } from 'vue'
import { findChapter } from '@/utils/chapters'
import { fmtTime } from '@/utils/time'

defineOptions({ inheritAttrs: false })

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)
const { scrubbing, displayPercent, previewSeconds, onInput, onChange, onTouchStart, onTouchEnd, onPointerCancel } = useScrubber(player)

const formatTime = (seconds: number): string => fmtTime(seconds, true)

const THUMB_REACH = 1.5
const GAP_HALF_WIDTH = '2px'

const chapterMask = computed(() => {
  const duration = player.value?.duration ?? 0
  const chapters = player.value?.chapters ?? []
  if (!duration || chapters.length < 2) return undefined
  const stops = chapters
    .filter((chapter) => chapter.start > 0)
    .map((chapter) => (chapter.start / duration) * 100)
    .filter((percent) => Math.abs(percent - displayPercent.value) > THUMB_REACH)
    .map((percent) => `#000 calc(${percent}% - ${GAP_HALF_WIDTH}), transparent 0 calc(${percent}% + ${GAP_HALF_WIDTH}), #000 0`)
  if (!stops.length) return undefined
  return `linear-gradient(to right, #000, ${stops.join(', ')})`
})

const previewChapter = computed(() => findChapter(player.value?.chapters ?? [], previewSeconds.value)?.title)
</script>

<template>
  <div class="ml-video-scrubber-wrap">
    <input
      type="range"
      min="0"
      max="100"
      step="0.5"
      :value="displayPercent"
      class="ml-video-scrubber"
      :style="{ '--p': `${displayPercent}%`, '--b': `${player?.bufferedDisplay ?? 0}%`, maskImage: chapterMask }"
      aria-label="Seek"
      :aria-valuetext="`${formatTime(previewSeconds)} of ${formatTime(player?.duration ?? 0)}`"
      @input="onInput"
      @change="onChange"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
      @pointercancel="onPointerCancel"
      v-bind="$attrs"
    />
    <slot
      name="preview"
      :scrubbing="scrubbing"
      :percent="displayPercent"
      :preview-seconds="previewSeconds"
      :chapter="previewChapter"
      :format-time="formatTime"
    >
      <div v-if="scrubbing" class="ml-video-scrubber__preview" :style="{ left: `${displayPercent}%` }">
        <span v-if="previewChapter" class="ml-video-scrubber__chapter">{{ previewChapter }}</span>
        {{ formatTime(previewSeconds) }}
      </div>
    </slot>
  </div>
</template>

<style scoped>
.ml-video-scrubber-wrap {
  position: relative;
  width: 100%;
}

:where(.ml-video-scrubber) {
  width: 100%;
  cursor: pointer;
  accent-color: currentColor;
}

:where(.ml-video-scrubber):focus-visible {
  outline: 2px solid #fff !important;
  outline-offset: 0 !important;
}

.ml-video-scrubber__chapter {
  display: block;
  font-weight: 600;
}

.ml-video-scrubber__preview {
  position: absolute;
  bottom: 100%;
  transform: translateX(-50%);
  margin-bottom: 0.4rem;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  white-space: nowrap;
}
</style>
