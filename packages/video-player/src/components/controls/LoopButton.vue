<script setup lang="ts">
import { toRef } from 'vue'
import Icon from '@/components/Icon.vue'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(toRef(props, 'player'), toRef(props, 'for'))
</script>

<template>
  <button
    type="button"
    class="mlv-loop-button"
    :class="{ 'mlv-loop-button--active': player?.isLooping }"
    :aria-pressed="player?.isLooping ?? false"
    aria-label="Toggle loop"
    @click="player?.toggleLoop()"
  >
    <slot :is-looping="player?.isLooping ?? false">
      <Icon name="loop" />
    </slot>
  </button>
</template>

<style scoped>
:where(.mlv-loop-button) {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
}

:where(.mlv-loop-button):focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

:where(.mlv-loop-button--active) {
  opacity: 1;
}

:where(.mlv-loop-button :deep(svg)) {
  width: 1em;
  height: 1em;
}
</style>
