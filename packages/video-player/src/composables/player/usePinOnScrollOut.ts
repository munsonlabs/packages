import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { isStageTucked } from '@/composables/registries/stageRegistry'
import { observeViewport } from '@/composables/player/viewportObserver'
import { PAUSE_BELOW_RATIO } from '@/constants'

export interface UsePinOnScrollOutReturn {
  isPinned: Ref<boolean>
  isTucked: Ref<boolean>
  unpin: () => void
}

/**
 * Inline `pin` behaviour. Pins at the same ratio auto-pause would have paused at. `targetEl` must be the
 * in-flow wrapper, never the pinned element: observing the fixed box would report "back in view" and re-pin forever.
 */
export function usePinOnScrollOut(targetEl: Ref<HTMLElement | null>, isPlaying: Ref<boolean>, enabled: Ref<boolean>): UsePinOnScrollOutReturn {
  const isPinned = ref(false)
  const isTucked = computed(() => isPinned.value && isStageTucked.value)

  let unobserve: (() => void) | null = null

  function setupObserver(): void {
    unobserve?.()
    unobserve = null
    if (!enabled.value || !targetEl.value) {
      isPinned.value = false
      return
    }

    unobserve = observeViewport(targetEl.value, (entry) => {
      if (entry.intersectionRatio < PAUSE_BELOW_RATIO) {
        if (isPlaying.value) isPinned.value = true
      } else {
        isPinned.value = false
      }
    })
  }

  onMounted(setupObserver)
  watch(enabled, setupObserver)
  watch(targetEl, setupObserver)

  onBeforeUnmount(() => unobserve?.())

  return { isPinned, isTucked, unpin: () => (isPinned.value = false) }
}
