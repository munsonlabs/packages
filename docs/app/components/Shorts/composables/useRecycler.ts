import { computed, ref, nextTick, watch, onBeforeUnmount, type Ref } from 'vue'

const SETTLE_MS = 120
const BOUNCE_MS = 450

export interface UseRecyclerReturn<T> {
  /** Always three entries: prev, current, next. A null is the empty slot at either end of the feed. */
  slots: Ref<(T | null)[]>
  index: Ref<number>
  onScroll: () => void
  go: (delta: number) => void
}

/**
 * Holds the current entry in the middle of a three-slide scroller and resets `scrollTop` back to
 * it after each swipe, so the DOM never grows with the feed.
 */
export function useRecycler<T>(scroller: Ref<HTMLElement | null>, items: T[]): UseRecyclerReturn<T> {
  const index = ref(0)
  const slots = computed(() => [items[index.value - 1] ?? null, items[index.value] ?? null, items[index.value + 1] ?? null])

  let slideHeight = 0
  // Set around every programmatic scroll, so the resets below don't read as a swipe and recycle again.
  let recycling = false
  let settleTimer: ReturnType<typeof setTimeout> | null = null
  let bounceTimer: ReturnType<typeof setTimeout> | null = null
  let ro: ResizeObserver | null = null

  function centre(smooth: boolean): void {
    const el = scroller.value
    if (!el || !slideHeight) return
    recycling = true
    el.scrollTo({ top: slideHeight, behavior: smooth ? 'smooth' : 'auto' })
    if (bounceTimer) clearTimeout(bounceTimer)
    // Smooth scrolling has no cross-browser completion callback, so a fixed delay beats juggling 'scrollend'.
    if (smooth)
      bounceTimer = setTimeout(() => {
        recycling = false
      }, BOUNCE_MS)
    else
      requestAnimationFrame(() => {
        recycling = false
      })
  }

  function measure(): void {
    const el = scroller.value
    if (!el) return
    slideHeight = el.clientHeight
    centre(false)
  }

  async function onSettled(): Promise<void> {
    const el = scroller.value
    if (!el || recycling || !slideHeight) return

    const landed = Math.round(el.scrollTop / slideHeight)
    if (landed === 1) return

    const next = index.value + (landed - 1)
    if (next < 0 || next >= items.length) return centre(true)

    index.value = next
    await nextTick()
    centre(false)
  }

  function onScroll(): void {
    if (recycling) return
    if (settleTimer) clearTimeout(settleTimer)
    settleTimer = setTimeout(onSettled, SETTLE_MS)
  }

  function go(delta: number): void {
    const el = scroller.value
    if (!el || !slideHeight) return
    if (index.value + delta < 0 || index.value + delta >= items.length) return
    // Scroll the container itself rather than scrollIntoView, which walks every scrollable
    // ancestor and would drag the surrounding page along with it.
    el.scrollTo({ top: (1 + delta) * slideHeight, behavior: 'smooth' })
  }

  // The scroller only exists once the feed's dynamic import resolves, so attach when the ref appears.
  watch(scroller, (el) => {
    ro?.disconnect()
    if (!el) return
    ro = new ResizeObserver(measure)
    ro.observe(el)
  })

  onBeforeUnmount(() => {
    ro?.disconnect()
    if (settleTimer) clearTimeout(settleTimer)
    if (bounceTimer) clearTimeout(bounceTimer)
  })

  return { slots, index, onScroll, go }
}
