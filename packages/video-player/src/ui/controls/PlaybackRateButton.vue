<script setup lang="ts">
import '@/ui/styles/controlButton.css'
import { computed } from 'vue'
import { PLAYBACK_RATES } from '@/constants'
import { cyclePlaybackRate, playbackRateLabel } from '@/utils/playerActions'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/ui/controls/useResolvedPlayer'

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
    class="ml-video-control-btn ml-video-control-btn--toggle ml-video-playback-rate-button"
    :class="{ 'ml-video-control-btn--active ml-video-playback-rate-button--active': player?.currentPlaybackRate !== 1 }"
    :aria-label="`Playback speed: ${currentLabel}`"
    @click="cycle"
  >
    <slot :current-label="currentLabel" :rate="player?.currentPlaybackRate ?? 1" :rates="[...PLAYBACK_RATES]">
      {{ currentLabel }}
    </slot>
  </button>
</template>
