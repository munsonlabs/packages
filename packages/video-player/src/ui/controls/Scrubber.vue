<script setup lang="ts">
import { useScrubber } from '@/ui/controls/useScrubber'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/ui/controls/useResolvedPlayer'
import { fmtTime } from '@/utils/time'

defineOptions({ inheritAttrs: false })

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)
const { scrubbing, displayPercent, previewSeconds, onInput, onChange, onTouchStart, onTouchEnd, onPointerCancel } = useScrubber(player)

const formatTime = (seconds: number): string => fmtTime(seconds, true)
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
      :style="{ '--p': `${displayPercent}%`, '--b': `${player?.bufferedDisplay ?? 0}%` }"
      aria-label="Seek"
      :aria-valuetext="`${formatTime(previewSeconds)} of ${formatTime(player?.duration ?? 0)}`"
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
