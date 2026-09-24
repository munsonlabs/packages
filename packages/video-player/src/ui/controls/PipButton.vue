<script setup lang="ts">
import '@/ui/styles/controlButton.css'
import Icon from '@/ui/shared/Icon.vue'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/ui/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)
</script>

<template>
  <button
    v-if="player?.supportsPip"
    type="button"
    class="ml-video-control-btn ml-video-control-btn--toggle ml-video-pip-button"
    :class="{ 'ml-video-control-btn--active ml-video-pip-button--active': player?.isPipActive }"
    :aria-pressed="player?.isPipActive ?? false"
    aria-label="Toggle Picture-in-Picture"
    @click="player?.togglePip()"
  >
    <slot :is-pip-active="player?.isPipActive ?? false">
      <Icon name="pip" />
    </slot>
  </button>
</template>
