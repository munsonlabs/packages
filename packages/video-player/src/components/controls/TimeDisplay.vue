<script setup lang="ts">
import { toRef } from 'vue'
import { fmtTime } from '@/utils/time'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(toRef(props, 'player'), toRef(props, 'for'))
</script>

<template>
  <span class="mlv-time-display" :class="{ 'mlv-time-display--live': player?.isLive }">
    <slot :is-live="player?.isLive ?? false" :current="player?.current ?? 0" :total="player?.total ?? 0" :format-time="fmtTime">
      <template v-if="player?.isLive"> <span class="mlv-time-display__dot" />Live </template>
      <template v-else>
        <span class="mlv-time-display__time">{{ fmtTime(player?.current ?? 0) }}</span>
        <span class="mlv-time-display__total">/ {{ fmtTime(player?.total ?? 0) }}</span>
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
