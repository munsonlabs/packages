<script setup lang="ts">
import Spinner from '@/shared/Spinner.vue'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)
</script>

<template>
  <div v-if="player?.isBuffering" class="mlv-buffering" role="status" aria-label="Buffering">
    <slot :is-buffering="true">
      <Spinner />
    </slot>
  </div>
</template>

<style scoped>
:where(.mlv-buffering) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
