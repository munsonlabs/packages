<script setup lang="ts">
import { computed, toRef } from 'vue'
import { IconPlay, IconPause, IconReplay } from '@/components/icons'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(toRef(props, 'player'), toRef(props, 'for'))

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
  <button type="button" class="mlv-play-button" :aria-label="label" @click="onClick">
    <slot :is-playing="player?.isPlaying ?? false" :has-ended="player?.hasEnded ?? false" :is-error="player?.isError ?? false">
      <IconReplay v-if="status === 'error' || status === 'ended'" />
      <IconPause v-else-if="status === 'playing'" />
      <IconPlay v-else />
    </slot>
  </button>
</template>

<style scoped>
/* :where() keeps these at zero specificity so a consumer's own class always wins. */
:where(.mlv-play-button) {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

:where(.mlv-play-button):focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

:where(.mlv-play-button svg) {
  width: 1em;
  height: 1em;
}
</style>
