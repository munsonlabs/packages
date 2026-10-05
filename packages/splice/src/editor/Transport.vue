<script setup lang="ts">
import { computed } from 'vue'
import { Sigil } from '@munsonlabs/sigil/vue'
import { CaptionsButton, MuteButton, PlayButton, TimeDisplay, captionTrackLabel, type PlayerHandle } from '@munsonlabs/video-player'
import type { Range } from './features/range'
import type { EditorLabels } from '@/types/editor'

const props = defineProps<{
  player: PlayerHandle | null
  range: Range
  disabled: boolean
  labels: EditorLabels
}>()

const length = computed(() => props.range.end - props.range.start)
const toClipTime = (time: number) => Math.min(length.value, Math.max(0, time - props.range.start))

const hasCaptions = computed(() => props.player?.activeCaptionIndex !== null)
const captionsName = computed(() => {
  const track = props.player && hasCaptions.value ? captionTrackLabel(props.player) : props.labels.captionsOff
  return `${props.labels.captions}: ${track}`
})
</script>

<template>
  <div class="splice-transport">
    <PlayButton :player="player" :disabled="disabled" :aria-label="player?.isPlaying ? labels.pause : labels.play" />
    <TimeDisplay v-slot="{ currentTime, formatTime }" :player="player" class="splice-clock">
      {{ formatTime(toClipTime(currentTime)) }} / {{ formatTime(length, true) }}
    </TimeDisplay>
    <MuteButton :player="player" :disabled="disabled" :aria-label="player?.isMuted ? labels.unmute : labels.mute" />
    <CaptionsButton v-slot="{ currentLabel }" :player="player" :disabled="disabled" :aria-label="captionsName" :title="captionsName">
      <Sigil name="captions" library="mlv" class="splice-icon" />
      <span class="splice-transport__label">{{ hasCaptions ? currentLabel : labels.captionsOff }}</span>
    </CaptionsButton>
  </div>
</template>

<style scoped>
.splice-transport {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  font-size: var(--splice-icon-size, 20px);
}

/* The player's stylesheet may not reach the panel, so the buttons are styled whole here. */
.splice-transport :deep(.ml-video-control-btn) {
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 6px;
  color: var(--_fg);
  cursor: pointer;
}

.splice-transport :deep(.ml-video-control-btn svg) {
  display: block;
  width: 1em;
  height: 1em;
}

.splice-transport :deep(.ml-video-control-btn:hover:not(:disabled)) {
  background: var(--_surface);
}

.splice-transport :deep(.ml-video-control-btn:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

.splice-transport :deep(.ml-video-control-btn:focus-visible) {
  outline: 3px solid var(--_focus);
  outline-offset: 2px;
}

.splice-transport :deep(.ml-video-control-btn--toggle:not(.ml-video-control-btn--active)) {
  color: var(--_muted);
}

.splice-clock {
  margin: 0 6px;
  color: var(--_muted);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.splice-transport__label {
  font-size: 0.8rem;
  font-weight: 600;
}
</style>
