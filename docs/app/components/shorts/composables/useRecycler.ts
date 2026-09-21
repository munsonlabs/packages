import { computed, ref, nextTick, watch, onBeforeUnmount, type Ref } from 'vue'

const SETTLE_MS = 120
const BOUNCE_MS = 450
/** Ask for the next page this many slides before running out, so it lands before the viewer gets there. */
const LOAD_AHEAD = 2

export interface UseRecyclerReturn<T> {
  slots: Ref<(T | null)[]>
  index: Ref<number>
  onScroll: () => void
  go: (delta: number) => void
  reset: () => void
}

export function useRecycler<T>(scroller: Ref<HTMLElement | null>, items: Ref<T[]>, loadMore: () => void): UseRecyclerReturn<T> {
  const index = ref(0)
  const slots = computed(() => [items.value[index.value - 1] ?? null, items.value[index.value] ?? null, items.value[index.value + 1] ?? null])

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
    if (next < 0 || next >= items.value.length) return centre(true)

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
    if (index.value + delta < 0 || index.value + delta >= items.value.length) return
    // Scroll the container itself rather than scrollIntoView, which walks every scrollable
    // ancestor and would drag the surrounding page along with it.
    el.scrollTo({ top: (1 + delta) * slideHeight, behavior: 'smooth' })
  }

  function loadAhead(): void {
    if (index.value >= items.value.length - LOAD_AHEAD) loadMore()
  }

  function reset(): void {
    index.value = 0
    centre(false)
  }

  watch(scroller, (el) => {
    ro?.disconnect()
    if (!el) return
    ro = new ResizeObserver(measure)
    ro.observe(el)
    loadAhead()
  })

  watch([index, () => items.value.length], loadAhead)

  onBeforeUnmount(() => {
    ro?.disconnect()
    if (settleTimer) clearTimeout(settleTimer)
    if (bounceTimer) clearTimeout(bounceTimer)
  })

  return { slots, index, onScroll, go, reset }
}
