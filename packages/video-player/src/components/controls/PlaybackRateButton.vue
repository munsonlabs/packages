<script setup lang="ts">
import { computed } from 'vue'
import { PLAYBACK_RATES } from '@/constants'
import { cyclePlaybackRate, playbackRateLabel } from '@/utils/playerActions'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)

const currentLabel = computed(() => playbackRateLabel(player.value?.currentPlaybackRate ?? 1))

function cycle(): void {
  if (player.value) cyclePlaybackRate(player.value)
}
</script>

<template>
  <button
    v-if="player?.supportsPlaybackRate"
    type="button"
    class="mlv-playback-rate-button"
    :class="{ 'mlv-playback-rate-button--active': player?.currentPlaybackRate !== 1 }"
    :aria-label="`Playback speed: ${currentLabel}`"
    @click="cycle"
  >
    <slot :current-label="currentLabel" :rate="player?.currentPlaybackRate ?? 1" :rates="[...PLAYBACK_RATES]">
      {{ currentLabel }}
    </slot>
  </button>
</template>

<style scoped>
:where(.mlv-playback-rate-button) {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-variant-numeric: tabular-nums;
  opacity: 0.6;
}

:where(.mlv-playback-rate-button):focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

:where(.mlv-playback-rate-button--active) {
  opacity: 1;
}
</style>
