<script setup lang="ts">
import '@/ui/styles/controlButton.css'
import VolumeIcon from '@/ui/overlay/VolumeIcon.vue'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/ui/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)
</script>

<template>
  <button
    type="button"
    class="ml-video-control-btn ml-video-mute-button"
    :aria-pressed="player?.isMuted ?? false"
    :aria-label="player?.isMuted ? 'Unmute' : 'Mute'"
    @click="player?.toggleMute()"
  >
    <slot :is-muted="player?.isMuted ?? false">
      <VolumeIcon :is-audible="player?.isAudible ?? false" />
    </slot>
  </button>
</template>
