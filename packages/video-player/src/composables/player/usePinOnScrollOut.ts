import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { isStageTucked } from '@/composables/registries/stageRegistry'
import { observeViewport } from '@/composables/player/viewportObserver'
import { PAUSE_BELOW_RATIO } from '@/constants'

export interface UsePinOnScrollOutReturn {
  isPinned: Ref<boolean>
  isTucked: Ref<boolean>
  /** Dismisses the pin directly (e.g. the corner's own close button) - pausing alone no longer unpins. */
  unpin: () => void
}

/**
 * Opt-in (`pin`) counterpart to VideoStage's pin-to-corner behavior, for a single inline
 * player with no playlist. Shares PAUSE_BELOW_RATIO with useAutoPauseOffscreen (via the same
 * shared observeViewport registry) so it pins at exactly the ratio a player would otherwise have
 * been auto-paused at, since that's the behavior it's replacing.
 *
 * `targetEl` must stay put in the document's in-flow position regardless of pin state (VideoPlayer
 * passes its reserved-space wrapper, never the pinned `.player` itself), or observing the pinned
 * element directly would report "back in view" the instant it moves into its fixed corner, re-pin,
 * and repeat forever.
 *
 * Pausing while already pinned does NOT unpin it - like YouTube's mini-player, a paused-but-pinned
 * video stays put until scrolled back into view.
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
