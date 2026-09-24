<script setup lang="ts">
import '@/ui/styles/controlButton.css'
import Icon from '@/ui/shared/Icon.vue'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/ui/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)
</script>

<template>
  <button
    type="button"
    class="ml-video-control-btn ml-video-fullscreen-button"
    :aria-label="player?.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
    @click="player?.toggleFullscreen()"
  >
    <slot :is-fullscreen="player?.isFullscreen ?? false">
      <Icon name="fullscreen-exit" v-if="player?.isFullscreen" />
      <Icon name="fullscreen-enter" v-else />
    </slot>
  </button>
</template>
