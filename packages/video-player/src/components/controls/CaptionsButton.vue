<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import { cycleCaptionTrack, captionTrackLabel } from '@/utils/playerActions'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)

const currentLabel = computed(() => (player.value ? captionTrackLabel(player.value) : 'Off'))

function cycle(): void {
  if (player.value) cycleCaptionTrack(player.value)
}
</script>

<template>
  <button
    v-if="player?.supportsCaptions"
    type="button"
    class="mlv-captions-button"
    :class="{ 'mlv-captions-button--active': player?.activeCaptionIndex !== null }"
    :aria-label="`Captions: ${currentLabel}`"
    @click="cycle"
  >
    <slot :current-label="currentLabel" :tracks="player?.captionTracks ?? []" :active-index="player?.activeCaptionIndex ?? null">
      <Icon name="captions" />
    </slot>
  </button>
</template>

<style scoped>
:where(.mlv-captions-button) {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
}

:where(.mlv-captions-button):focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

:where(.mlv-captions-button--active) {
  opacity: 1;
}

:where(.mlv-captions-button :deep(svg)) {
  width: 1em;
  height: 1em;
}
</style>
