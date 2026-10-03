<script setup lang="ts">
import { computed } from 'vue'
import { useScrubber } from '@/ui/controls/useScrubber'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/ui/controls/useResolvedPlayer'
import { fmtTime } from '@/utils/time'

defineOptions({ inheritAttrs: false })

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)
const { scrubbing, displayPercent, previewSeconds, onInput, onChange, onTouchStart, onTouchEnd, onPointerCancel } = useScrubber(player)

const formatTime = (seconds: number): string => fmtTime(seconds, true)

/** The deep-linked range as percentages of the duration, for the highlight under the track. */
const range = computed(() => {
  const clip = player.value?.clipRange
  const duration = player.value?.duration
  if (!clip || !duration) return null
  const start = Math.min(100, (clip.start / duration) * 100)
  const end = clip.end === null ? start : Math.min(100, (clip.end / duration) * 100)
  return { start, width: Math.max(end - start, 0.6) }
})
</script>

<template>
  <div class="ml-video-scrubber-wrap">
    <div
      v-if="range"
      class="ml-video-scrubber__range"
      data-testid="clip-range"
      aria-hidden="true"
      :style="{ left: `${range.start}%`, width: `${range.width}%` }"
    />
    <input
      type="range"
      min="0"
      max="100"
      step="0.5"
      :value="displayPercent"
      class="ml-video-scrubber"
      :style="{ '--p': `${displayPercent}%`, '--b': `${player?.bufferedDisplay ?? 0}%` }"
      aria-label="Seek"
      :aria-valuetext="
        `${formatTime(previewSeconds)} of ${formatTime(player?.duration ?? 0)}` +
        (player?.clipRange ? `, linked moment from ${formatTime(player.clipRange.start)}` : '') +
        (player?.clipRange?.end != null ? ` to ${formatTime(player.clipRange.end)}` : '')
      "
      @input="onInput"
      @change="onChange"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
      @pointercancel="onPointerCancel"
      v-bind="$attrs"
    />
    <slot name="preview" :scrubbing="scrubbing" :percent="displayPercent" :preview-seconds="previewSeconds" :format-time="formatTime">
      <div v-if="scrubbing" class="ml-video-scrubber__preview" :style="{ left: `${displayPercent}%` }">
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

.ml-video-scrubber__range {
  position: absolute;
  top: 50%;
  height: 8px;
  transform: translateY(-50%);
  border-radius: 4px;
  background: var(--ml-video-range-color, rgba(255, 214, 10, 0.55));
  pointer-events: none;
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
