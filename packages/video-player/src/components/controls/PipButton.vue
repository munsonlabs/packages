<script setup lang="ts">
import { toRef } from 'vue'
import { IconPip } from '@/components/icons'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(toRef(props, 'player'), toRef(props, 'for'))
</script>

<template>
  <button
    v-if="player?.supportsPip"
    type="button"
    class="mlv-pip-button"
    :class="{ 'mlv-pip-button--active': player?.isPipActive }"
    :aria-pressed="player?.isPipActive ?? false"
    aria-label="Toggle Picture-in-Picture"
    @click="player?.togglePip()"
  >
    <slot :is-pip-active="player?.isPipActive ?? false">
      <IconPip />
    </slot>
  </button>
</template>

<style scoped>
:where(.mlv-pip-button) {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
}

:where(.mlv-pip-button):focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

:where(.mlv-pip-button--active) {
  opacity: 1;
}

:where(.mlv-pip-button svg) {
  width: 1em;
  height: 1em;
}
</style>
