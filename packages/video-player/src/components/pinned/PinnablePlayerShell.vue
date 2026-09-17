<script setup lang="ts">
import { ref, computed, toRef, watch } from 'vue'
import { usePinOnScrollOut } from '@/composables/player/viewport/usePinOnScrollOut'
import { usePinnedReservedSpace } from '@/composables/player/viewport/usePinnedReservedSpace'
import { isStageTucked } from '@/composables/registries/stageRegistry'
import { runFlipTransition } from '@/utils/flipTransition'
import { scrollIntoCenter } from '@/utils/scrollIntoCenter'

const props = defineProps<{ isPlaying: boolean }>()

const wrapperEl = ref<HTMLElement | null>(null)
const boxEl = ref<HTMLElement | null>(null)

/** Observes the in-flow wrapper, never the pinned box - see usePinOnScrollOut. */
const { isPinned: decidedPinned, unpin } = usePinOnScrollOut(wrapperEl, toRef(props, 'isPlaying'), ref(true))

const isPinned = ref(decidedPinned.value)
watch(decidedPinned, (val) => {
  void runFlipTransition(boxEl.value, () => {
    isPinned.value = val
  })
})

const isTucked = computed(() => isPinned.value && isStageTucked.value)

const { wrapperStyle } = usePinnedReservedSpace(wrapperEl, boxEl, isPinned)

function scrollToPlayer(): void {
  scrollIntoCenter(wrapperEl.value)
}

function setBoxEl(el: Element | null): void {
  boxEl.value = el as HTMLElement | null
}
</script>

<template>
  <div ref="wrapperEl" class="player-wrapper" :style="wrapperStyle">
    <slot :is-pinned="isPinned" :is-tucked="isTucked" :set-box-el="setBoxEl" :unpin="unpin" :scroll-to-player="scrollToPlayer" />
  </div>
</template>

<style scoped>
.player-wrapper {
  display: block;
}
</style>
