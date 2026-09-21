<script setup lang="ts">
import { fmtTime } from '@/utils/time'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)
</script>

<template>
  <span class="mlv-time-display" :class="{ 'mlv-time-display--live': player?.isLive }">
    <slot :is-live="player?.isLive ?? false" :current-time="player?.currentTime ?? 0" :duration="player?.duration ?? 0" :format-time="fmtTime">
      <template v-if="player?.isLive"> <span class="mlv-time-display__dot" />Live </template>
      <template v-else>
        <span class="mlv-time-display__time">{{ fmtTime(player?.currentTime ?? 0) }}</span>
        <span class="mlv-time-display__total">/ {{ fmtTime(player?.duration ?? 0) }}</span>
      </template>
    </slot>
  </span>
</template>

<style scoped>
:where(.mlv-time-display) {
  font-variant-numeric: tabular-nums;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

:where(.mlv-time-display__dot) {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
</style>
