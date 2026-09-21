<script setup lang="ts">
import Icon from '@/components/Icon.vue'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)
</script>

<template>
  <button
    type="button"
    class="mlv-fullscreen-button"
    :aria-label="player?.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
    @click="player?.toggleFullscreen()"
  >
    <slot :is-fullscreen="player?.isFullscreen ?? false">
      <Icon name="fullscreen-exit" v-if="player?.isFullscreen" />
      <Icon name="fullscreen-enter" v-else />
    </slot>
  </button>
</template>

<style scoped>
:where(.mlv-fullscreen-button) {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

:where(.mlv-fullscreen-button):focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

:where(.mlv-fullscreen-button :deep(svg)) {
  width: 1em;
  height: 1em;
}
</style>
