<script setup lang="ts">
import { computed } from 'vue'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'

defineOptions({ inheritAttrs: false })

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)

const displayPercent = computed(() => {
  const p = player.value
  if (!p) return 0
  return p.isMuted ? 0 : Math.round(p.currentVolume * 100)
})

function onInput(e: Event): void {
  player.value?.setVolume(Number((e.target as HTMLInputElement).value) / 100)
}
</script>

<template>
  <div class="mlv-volume-wrap">
    <input
      type="range"
      min="0"
      max="100"
      step="1"
      :value="displayPercent"
      class="mlv-volume-slider"
      :style="{ '--v': `${displayPercent}%` }"
      aria-label="Volume"
      @input="onInput"
      v-bind="$attrs"
    />
    <slot :percent="displayPercent">
      <span class="mlv-volume-pct">{{ displayPercent }}%</span>
    </slot>
  </div>
</template>

<style scoped>
.mlv-volume-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

:where(.mlv-volume-slider) {
  flex: 1;
  cursor: pointer;
  accent-color: currentColor;
}

:where(.mlv-volume-slider):focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

:where(.mlv-volume-pct) {
  font-variant-numeric: tabular-nums;
  min-width: 2rem;
  text-align: right;
}
</style>
