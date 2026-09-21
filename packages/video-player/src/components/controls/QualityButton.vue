<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import { cycleQuality, qualityLabel } from '@/utils/playerActions'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'

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
    class="mlv-quality-button"
    :class="{ 'mlv-quality-button--active': !player?.isAutoQuality }"
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

<style scoped>
:where(.mlv-quality-button) {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
}

:where(.mlv-quality-button):focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

:where(.mlv-quality-button--active) {
  opacity: 1;
}

:where(.mlv-quality-button :deep(svg)) {
  width: 1em;
  height: 1em;
}
</style>
