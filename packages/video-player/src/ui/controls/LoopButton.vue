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
    class="mlv-control-btn mlv-control-btn--toggle mlv-loop-button"
    :class="{ 'mlv-control-btn--active mlv-loop-button--active': player?.isLooping }"
    :aria-pressed="player?.isLooping ?? false"
    aria-label="Toggle loop"
    @click="player?.toggleLoop()"
  >
    <slot :is-looping="player?.isLooping ?? false">
      <Icon name="loop" />
    </slot>
  </button>
</template>
