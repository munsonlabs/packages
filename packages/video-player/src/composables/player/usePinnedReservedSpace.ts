import { ref, computed, watch, onBeforeUnmount } from 'vue'
import type { Ref, ComputedRef } from 'vue'

export interface UsePinnedReservedSpaceReturn {
  wrapperStyle: ComputedRef<{ height?: string }>
  /** Forces the reservation to clear immediately, rather than waiting for the isPinned watcher's next tick - VideoStage's dismiss() wants this synchronous. */
  clear: () => void
}

/**
 * Reserves a pinned box's last in-flow height on its wrapper so the page does not collapse under it. Scaled by the
 * WRAPPER's width change, not the box's: the box has a max-width, and scaling by it over-reserved on wide layouts
 * enough to flip the intersection ratio back over the pin threshold and flicker forever.
 */
export function usePinnedReservedSpace(
  wrapperEl: Ref<HTMLElement | null>,
  boxEl: Ref<HTMLElement | null>,
  isPinned: Ref<boolean>,
): UsePinnedReservedSpaceReturn {
  const reservedSize = ref<{ height: number; wrapperWidth: number } | null>(null)
  const wrapperWidth = ref<number | null>(null)

  /** Reads offsetWidth directly rather than the ResizeObserver-fed `wrapperWidth` ref, which may not have delivered its first entry yet if a player pins immediately on mount. */
  watch(isPinned, (val) => {
    const width = wrapperEl.value?.offsetWidth ?? null
    reservedSize.value = val && boxEl.value && width ? { height: boxEl.value.offsetHeight, wrapperWidth: width } : null
  })

  const wrapperStyle = computed(() => {
    if (!reservedSize.value) return {}
    const { height, wrapperWidth: capturedWrapperWidth } = reservedSize.value
    const scale = wrapperWidth.value ? wrapperWidth.value / capturedWrapperWidth : 1
    return { height: `${Math.round(height * scale)}px` }
  })

  let resizeObserver: ResizeObserver | null = null
  watch(
    wrapperEl,
    (el) => {
      resizeObserver?.disconnect()
      resizeObserver = null
      if (!el) return
      resizeObserver = new ResizeObserver(([entry]) => (wrapperWidth.value = entry.contentRect.width))
      resizeObserver.observe(el)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => resizeObserver?.disconnect())

  return { wrapperStyle, clear: () => (reservedSize.value = null) }
}
