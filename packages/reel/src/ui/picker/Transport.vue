<script setup lang="ts">
import { computed } from 'vue'
import { Sigil } from '@munsonlabs/sigil/vue'
import { CaptionsButton, MuteButton, PlayButton, TimeDisplay, captionTrackLabel, type PlayerHandle } from '@munsonlabs/video-player'
import type { PickerLabels } from '@/registries/pickerDefaults'
import type { Range } from '@/ui/picker/features/range'

/**
 * video-player's headless controls on the page's player, in the panel, named by the picker's labels:
 * the viewer need not reach for the player's own HUD while the editor has its picture. The time is
 * clip-relative. The captions button cycles the player's tracks, and the track on show is what the
 * export burns in.
 */
const props = defineProps<{
  player: PlayerHandle | null
  range: Range
  disabled: boolean
  labels: PickerLabels
}>()

const length = computed(() => props.range.end - props.range.start)
const offset = (time: number) => Math.min(length.value, Math.max(0, time - props.range.start))

const captionsName = computed(() => {
  const player = props.player
  const track = !player || player.activeCaptionIndex === null ? props.labels.captionsOff : captionTrackLabel(player)
  return `${props.labels.captions}: ${track}`
})
</script>

<template>
  <div class="reel-transport">
    <PlayButton :player="player" :disabled="disabled" :aria-label="player?.isPlaying ? labels.pause : labels.play" />
    <TimeDisplay v-slot="{ currentTime, formatTime }" :player="player" class="reel-clock">
      {{ formatTime(offset(currentTime)) }} / {{ formatTime(length, true) }}
    </TimeDisplay>
    <MuteButton :player="player" :disabled="disabled" :aria-label="player?.isMuted ? labels.unmute : labels.mute" />
    <CaptionsButton v-slot="{ currentLabel }" :player="player" :disabled="disabled" :aria-label="captionsName" :title="captionsName">
      <Sigil name="captions" library="mlv" class="reel-icon" />
      <span class="reel-transport__label">{{ player?.activeCaptionIndex === null ? labels.captionsOff : currentLabel }}</span>
    </CaptionsButton>
  </div>
</template>

<style scoped>
.reel-transport {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  font-size: var(--reel-icon-size, 20px);
}

/* The player's stylesheet may not reach the panel (an element on a page styling its own player), so
   the buttons are styled whole here. */
.reel-transport :deep(.ml-video-control-btn) {
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 6px;
  color: var(--_fg);
  cursor: pointer;
}

.reel-transport :deep(.ml-video-control-btn svg) {
  display: block;
  width: 1em;
  height: 1em;
}

.reel-transport :deep(.ml-video-control-btn:hover:not(:disabled)) {
  background: var(--_surface);
}

.reel-transport :deep(.ml-video-control-btn:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

.reel-transport :deep(.ml-video-control-btn:focus-visible) {
  outline: 3px solid var(--_focus);
  outline-offset: 2px;
}

.reel-transport :deep(.ml-video-control-btn--toggle:not(.ml-video-control-btn--active)) {
  color: var(--_muted);
}

.reel-clock {
  margin: 0 6px;
  color: var(--_muted);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.reel-transport__label {
  font-size: 0.8rem;
  font-weight: 600;
}
</style>
