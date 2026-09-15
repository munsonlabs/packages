<script setup lang="ts">
import { toRef } from 'vue'
import { useScrubber } from '@/composables/controls/useScrubber'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'
import { fmtTime } from '@/utils/time'

defineOptions({ inheritAttrs: false })

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(toRef(props, 'player'), toRef(props, 'for'))
const { scrubbing, displayPercent, previewSeconds, onInput, onChange, onTouchEnd } = useScrubber(player)

const formatTime = (seconds: number): string => fmtTime(seconds, true)
</script>

<template>
  <div class="mlv-scrubber-wrap">
    <input
      type="range"
      min="0"
      max="100"
      step="0.5"
      :value="displayPercent"
      class="mlv-scrubber"
      v-bind="$attrs"
      :style="{ '--p': `${displayPercent}%`, '--b': `${player?.bufferedDisplay ?? 0}%` }"
      aria-label="Seek"
      :aria-valuetext="`${formatTime(previewSeconds)} of ${formatTime(player?.total ?? 0)}`"
      @input="onInput"
      @change="onChange"
      @touchend="onTouchEnd"
    />
    <slot name="preview" :scrubbing="scrubbing" :percent="displayPercent" :preview-seconds="previewSeconds" :format-time="formatTime">
      <div v-if="scrubbing" class="mlv-scrubber__preview" :style="{ left: `${displayPercent}%` }">
        {{ formatTime(previewSeconds) }}
      </div>
    </slot>
  </div>
</template>

<style scoped>
.mlv-scrubber-wrap {
  position: relative;
  width: 100%;
}

/* :where() keeps this at zero specificity so a consumer's own class always wins. */
:where(.mlv-scrubber) {
  width: 100%;
  cursor: pointer;
  accent-color: currentColor;
}

/* Browsers render a native focus ring on a range input by default, but it's thin/subtle enough on this dark UI to be easy to miss - same explicit treatment as every other control here. */
:where(.mlv-scrubber):focus-visible {
  outline: 2px solid #fff !important;
  outline-offset: 0 !important;
}

.mlv-scrubber__preview {
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
