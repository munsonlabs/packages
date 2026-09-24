<script setup lang="ts">
import '@/ui/styles/controlButton.css'
import { computed } from 'vue'
import Icon from '@/ui/shared/Icon.vue'
import { cycleCaptionTrack, captionTrackLabel } from '@/utils/playerActions'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/ui/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)

const currentLabel = computed(() => (player.value ? captionTrackLabel(player.value) : 'Off'))

function cycle(): void {
  if (player.value) cycleCaptionTrack(player.value)
}
</script>

<template>
  <button
    v-if="player?.supportsCaptions"
    type="button"
    class="ml-video-control-btn ml-video-control-btn--toggle ml-video-captions-button"
    :class="{ 'ml-video-control-btn--active ml-video-captions-button--active': player?.activeCaptionIndex !== null }"
    :aria-label="`Captions: ${currentLabel}`"
    @click="cycle"
  >
    <slot :current-label="currentLabel" :tracks="player?.captionTracks ?? []" :active-index="player?.activeCaptionIndex ?? null">
      <Icon name="captions" />
    </slot>
  </button>
</template>
