import { onBeforeUnmount, ref, watch } from 'vue'
import type { Ref } from 'vue'

export const COMPACT_CONTROLS_WIDTH_PX = 250

/** Tracks whether an element is narrower than a threshold, for layouts that can't be expressed as a container query. */
export function useElementCompact(el: Ref<HTMLElement | null>, thresholdPx = COMPACT_CONTROLS_WIDTH_PX): Ref<boolean> {
  const compact = ref(false)
  let observer: ResizeObserver | null = null

  watch(
    el,
    (node) => {
      observer?.disconnect()
      observer = null
      if (!node) return
      observer = new ResizeObserver(([entry]) => {
        compact.value = entry.contentRect.width < thresholdPx
      })
      observer.observe(node)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => observer?.disconnect())

  return compact
}
