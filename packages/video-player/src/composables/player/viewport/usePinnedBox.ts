import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { isStageTucked } from '@/composables/registries/stageRegistry'
import { usePinnedReservedSpace } from '@/composables/player/viewport/usePinnedReservedSpace'
import { runFlipTransition } from '@/utils/flipTransition'
import { scrollIntoCenter } from '@/utils/scrollIntoCenter'

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
 *
 * Both the decision and whether it animates stay with the caller, because they differ: the player
 * pins once it is playing and mostly out of view and always animates the move, while the stage also
 * pins on a player mounting into an already-scrolled-away stage - a content swap, not a move. That
 * one must not animate. A FLIP parks the box at its old, off-screen position for the length of the
 * transition, which is long enough for the player's own auto-pause to see it leave the viewport and
 * stop playback.
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
