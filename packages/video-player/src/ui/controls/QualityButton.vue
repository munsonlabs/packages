<script setup lang="ts">
import '@/ui/styles/controlButton.css'
import { computed } from 'vue'
import Icon from '@/ui/shared/Icon.vue'
import { cycleQuality, qualityLabel } from '@/utils/playerActions'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/ui/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)

const currentLabel = computed(() => (player.value ? qualityLabel(player.value) : 'Auto'))

function cycle(): void {
  if (player.value) cycleQuality(player.value)
}
</script>

<template>
  <button
    v-if="player?.supportsQuality"
    type="button"
    class="ml-video-control-btn ml-video-control-btn--toggle ml-video-quality-button"
    :class="{ 'ml-video-control-btn--active ml-video-quality-button--active': !player?.isAutoQuality }"
    :aria-label="`Quality: ${currentLabel}`"
    @click="cycle"
  >
    <slot
      :current-label="currentLabel"
      :levels="player?.qualityLevels ?? []"
      :current-height="player?.currentQualityHeight ?? null"
      :is-auto="player?.isAutoQuality ?? true"
    >
      <Icon name="quality" />
    </slot>
  </button>
</template>
