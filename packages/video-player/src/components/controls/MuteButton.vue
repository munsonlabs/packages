<script setup lang="ts">
import { toRef } from 'vue'
import VolumeIcon from '@/components/overlay/VolumeIcon.vue'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(toRef(props, 'player'), toRef(props, 'for'))
</script>

<template>
  <button type="button" class="mlv-mute-button" :aria-label="player?.isMuted ? 'Unmute' : 'Mute'" @click="player?.toggleMute()">
    <slot :is-muted="player?.isMuted ?? false">
      <VolumeIcon :is-audible="player?.isAudible ?? false" />
    </slot>
  </button>
</template>

<style scoped>
:where(.mlv-mute-button) {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

:where(.mlv-mute-button):focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

:where(.mlv-mute-button :deep(svg)) {
  width: 1em;
  height: 1em;
}
</style>
