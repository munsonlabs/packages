<script setup lang="ts">
import '@/styles/controlButton.css'
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)

const status = computed<'error' | 'ended' | 'playing' | 'idle'>(() => {
  if (player.value?.isError) return 'error'
  if (player.value?.hasEnded) return 'ended'
  if (player.value?.isPlaying) return 'playing'
  return 'idle'
})

const label = computed(() => {
  switch (status.value) {
    case 'error':
      return 'Retry'
    case 'ended':
      return 'Replay'
    case 'playing':
      return 'Pause'
    default:
      return 'Play'
  }
})

function onClick(): void {
  const p = player.value
  if (!p) return
  if (p.isError) p.retry()
  else p.togglePlay()
}
</script>

<template>
  <button type="button" class="mlv-control-btn mlv-play-button" :aria-label="label" @click="onClick">
    <slot :is-playing="player?.isPlaying ?? false" :has-ended="player?.hasEnded ?? false" :is-error="player?.isError ?? false">
      <Icon name="replay" v-if="status === 'error' || status === 'ended'" />
      <Icon name="pause" v-else-if="status === 'playing'" />
      <Icon name="play" v-else />
    </slot>
  </button>
</template>
