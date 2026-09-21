<script setup lang="ts">
import '@/styles/controlButton.css'
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
    class="mlv-control-btn mlv-control-btn--toggle mlv-playback-rate-button"
    :class="{ 'mlv-control-btn--active mlv-playback-rate-button--active': player?.currentPlaybackRate !== 1 }"
    :aria-label="`Playback speed: ${currentLabel}`"
    @click="cycle"
  >
    <slot :current-label="currentLabel" :rate="player?.currentPlaybackRate ?? 1" :rates="[...PLAYBACK_RATES]">
      {{ currentLabel }}
    </slot>
  </button>
</template>
