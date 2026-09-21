<script setup lang="ts">
import '@/styles/controlButton.css'
import Icon from '@/shared/Icon.vue'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)
</script>

<template>
  <button
    type="button"
    class="mlv-control-btn mlv-fullscreen-button"
    :aria-label="player?.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
    @click="player?.toggleFullscreen()"
  >
    <slot :is-fullscreen="player?.isFullscreen ?? false">
      <Icon name="fullscreen-exit" v-if="player?.isFullscreen" />
      <Icon name="fullscreen-enter" v-else />
    </slot>
  </button>
</template>
