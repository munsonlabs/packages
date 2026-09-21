<script setup lang="ts">
import '@/styles/controlButton.css'
import Icon from '@/shared/Icon.vue'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)
</script>

<template>
  <button
    v-if="player?.supportsPip"
    type="button"
    class="mlv-control-btn mlv-control-btn--toggle mlv-pip-button"
    :class="{ 'mlv-control-btn--active mlv-pip-button--active': player?.isPipActive }"
    :aria-pressed="player?.isPipActive ?? false"
    aria-label="Toggle Picture-in-Picture"
    @click="player?.togglePip()"
  >
    <slot :is-pip-active="player?.isPipActive ?? false">
      <Icon name="pip" />
    </slot>
  </button>
</template>
