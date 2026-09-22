import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { isStageTucked } from '@/registries/stageRegistry'
import { usePinnedReservedSpace } from '@/ui/pinned/usePinnedReservedSpace'
import { runFlipTransition } from '@/utils/flipTransition'

export function scrollIntoCenter(el: HTMLElement | null): void {
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
export interface UsePinnedBoxReturn {
  isPinned: Ref<boolean>
  isTucked: ComputedRef<boolean>
  wrapperStyle: ComputedRef<{ height?: string }>
  setPinned: (pinned: boolean, options?: { animate?: boolean }) => void
  unpin: () => void
  clearReservedSpace: () => void
  scrollToBox: () => void
}

/**
 * What a pinned corner box does once something has decided it should pin: hold the page open where
 * it used to sit, tuck aside for a HideMarker, and scroll back to where it belongs. The player and
 * the stage share all of that.
 */
export function usePinnedBox(wrapperEl: Ref<HTMLElement | null>, boxEl: Ref<HTMLElement | null>): UsePinnedBoxReturn {
  const isPinned = ref(false)

  function setPinned(pinned: boolean, { animate = true }: { animate?: boolean } = {}): void {
    if (pinned === isPinned.value) return
    if (!animate) {
      isPinned.value = pinned
      return
    }
    void runFlipTransition(boxEl.value, () => {
      isPinned.value = pinned
    })
  }

  const isTucked = computed(() => isPinned.value && isStageTucked.value)
  const { wrapperStyle, clear: clearReservedSpace } = usePinnedReservedSpace(wrapperEl, boxEl, isPinned)

  return {
    isPinned,
    isTucked,
    wrapperStyle,
    setPinned,
    unpin: () => (isPinned.value = false),
    clearReservedSpace,
    scrollToBox: () => scrollIntoCenter(wrapperEl.value),
  }
}
