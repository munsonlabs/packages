<script setup lang="ts">
import { toRef } from 'vue'
import Spinner from '@/components/Spinner.vue'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'

const props = defineProps<ResolvedPlayerProps>()
const player = useResolvedPlayer(toRef(props, 'player'), toRef(props, 'for'))
</script>

<template>
  <div v-if="player?.isBuffering" class="mlv-buffering">
    <slot>
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
