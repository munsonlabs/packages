<script setup lang="ts">
import { computed, toRef } from 'vue'
import { IconCaptions } from '@/components/icons'
import { useCaptions } from '@/composables/overlay/useCaptions'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(toRef(props, 'player'), toRef(props, 'for'))

/** See useCaptions.ts for why calling it fresh here (rather than once at setup) is safe. */
const captions = computed(() => (player.value ? useCaptions(player.value) : null))
const currentLabel = computed(() => captions.value?.currentCaptionLabel() ?? 'Off')

function cycle(): void {
  captions.value?.cycleCaptionTrack()
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
      <IconCaptions />
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

:where(.mlv-captions-button svg) {
  width: 1em;
  height: 1em;
}
</style>
