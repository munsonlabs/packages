<script setup lang="ts">
import { ref, toRef, watch } from 'vue'
import { usePinOnScrollOut } from '@/pinned/usePinOnScrollOut'
import { usePinnedBox } from '@/pinned/usePinnedBox'

const props = defineProps<{ isPlaying: boolean }>()

const wrapperEl = ref<HTMLElement | null>(null)
const boxEl = ref<HTMLElement | null>(null)

const { isPinned: shouldPin } = usePinOnScrollOut(wrapperEl, toRef(props, 'isPlaying'))
const { isPinned, isTucked, wrapperStyle, setPinned, unpin, scrollToBox } = usePinnedBox(wrapperEl, boxEl)

watch(shouldPin, (pinned) => setPinned(pinned))

function setBoxEl(el: Element | null): void {
  boxEl.value = el as HTMLElement | null
}
</script>

<template>
  <div ref="wrapperEl" class="player-wrapper" :style="wrapperStyle">
    <slot :is-pinned="isPinned" :is-tucked="isTucked" :set-box-el="setBoxEl" :unpin="unpin" :scroll-to-player="scrollToBox" />
  </div>
</template>

<style scoped>
.player-wrapper {
  display: block;
}
</style>
