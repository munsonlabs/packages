<script setup lang="ts">
import { ref, computed, toRef, watch } from 'vue'
import { usePinOnScrollOut } from '@/composables/player/usePinOnScrollOut'
import { usePinnedReservedSpace } from '@/composables/player/usePinnedReservedSpace'
import { isStageTucked } from '@/composables/registries/stageRegistry'
import { runFlipTransition } from '@/utils/flipTransition'
import { scrollIntoCenter } from '@/utils/scrollIntoCenter'

const props = defineProps<{ isPlaying: boolean }>()

const wrapperEl = ref<HTMLElement | null>(null)
const boxEl = ref<HTMLElement | null>(null)

/**
 * Observes `wrapperEl`, not the pinned box itself - the box moves to a fixed screen corner once
 * pinned, so watching it directly would report "back in view" the instant it pins, unpin it, snap
 * back, re-pin, and repeat forever. `wrapperEl` never moves regardless of pin state, exactly like
 * VideoStage observes its own stage-wrapper rather than the pinned `.stage`.
 */
const { isPinned: decidedPinned, unpin } = usePinOnScrollOut(wrapperEl, toRef(props, 'isPlaying'), ref(true))

/** Wrapped in a FLIP transition (same as VideoStage's minify) so the inline-to-fixed-corner jump animates instead of cutting instantly. */
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
