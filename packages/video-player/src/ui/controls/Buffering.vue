<script setup lang="ts">
import Spinner from '@/ui/shared/Spinner.vue'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/ui/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(props)
</script>

<template>
  <div v-if="player?.isBuffering" class="ml-video-buffering" role="status" aria-label="Buffering">
    <slot :is-buffering="true">
      <Spinner />
    </slot>
  </div>
</template>

<style scoped>
:where(.ml-video-buffering) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
