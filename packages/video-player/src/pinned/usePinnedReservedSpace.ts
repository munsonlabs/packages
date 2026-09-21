import { ref, computed, watch, onBeforeUnmount } from 'vue'
import type { Ref, ComputedRef } from 'vue'

export interface UsePinnedReservedSpaceReturn {
  wrapperStyle: ComputedRef<{ height?: string }>
  clear: () => void
}

/**
 * Reserves a pinned box's last in-flow height on its wrapper so the page does not collapse under it.
 */
export function usePinnedReservedSpace(
  wrapperEl: Ref<HTMLElement | null>,
  boxEl: Ref<HTMLElement | null>,
  isPinned: Ref<boolean>,
): UsePinnedReservedSpaceReturn {
  const reservedSize = ref<{ height: number; wrapperWidth: number } | null>(null)
  const wrapperWidth = ref<number | null>(null)

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
