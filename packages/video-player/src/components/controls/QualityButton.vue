<script setup lang="ts">
import { computed, toRef } from 'vue'
import Icon from '@/components/Icon.vue'
import { useQuality } from '@/composables/overlay/useQuality'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(toRef(props, 'player'), toRef(props, 'for'))

const quality = computed(() => (player.value ? useQuality(player.value) : null))
const currentLabel = computed(() => quality.value?.currentQualityLabel() ?? 'Auto')

function cycle(): void {
  quality.value?.cycleQuality()
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
      :current-index="player?.currentQualityIndex ?? null"
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
