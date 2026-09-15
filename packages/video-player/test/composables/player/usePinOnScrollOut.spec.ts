import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'
import { withSetup } from '@test/composables/withSetup'
import { usePinOnScrollOut } from '@/composables/player/usePinOnScrollOut'

let capturedCallback: ((entries: Array<{ intersectionRatio: number }>) => void) | null = null
let observeSpy: ReturnType<typeof vi.fn>
let disconnectSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  capturedCallback = null
  observeSpy = vi.fn()
  disconnectSpy = vi.fn()
  window.IntersectionObserver = class {
    constructor(cb: unknown) {
      capturedCallback = cb as (entries: Array<{ intersectionRatio: number }>) => void
    }
    observe = observeSpy
    disconnect = disconnectSpy
    unobserve = vi.fn()
    takeRecords = vi.fn()
  } as unknown as typeof IntersectionObserver
})

/** Mirrors useAutoPauseOffscreen's own PAUSE_BELOW_RATIO (0.1) boundary - usePinOnScrollOut shares it. */
function fireEntry(inView: boolean): void {
  capturedCallback?.([{ intersectionRatio: inView ? 1 : 0 }])
}

function setup(isPlayingInitial: boolean, enabledInitial: boolean) {
  const targetEl = ref<HTMLElement | null>(document.createElement('div'))

  const isPlaying = ref(isPlayingInitial)
  const enabled = ref(enabledInitial)
  const { result, wrapper } = withSetup(() => usePinOnScrollOut(targetEl, isPlaying, enabled))
  return { ...result, wrapper, isPlaying, enabled }
}

describe('usePinOnScrollOut', () => {
  it('does not observe when disabled', () => {
    setup(true, false)
    expect(observeSpy).not.toHaveBeenCalled()
  })

  it('does not observe when the target element is not mounted yet', () => {
    const targetEl = ref<HTMLElement | null>(null)
    withSetup(() => usePinOnScrollOut(targetEl, ref(true), ref(true)))
    expect(observeSpy).not.toHaveBeenCalled()
  })

  it('pins once the shell leaves the viewport while playing', () => {
    const { isPinned } = setup(true, true)

    fireEntry(false)

    expect(isPinned.value).toBe(true)
  })

  it('does not pin while paused', () => {
    const { isPinned } = setup(false, true)

    fireEntry(false)

    expect(isPinned.value).toBe(false)
  })

  it('unpins once the shell scrolls back into view', () => {
    const { isPinned } = setup(true, true)

    fireEntry(false)
    expect(isPinned.value).toBe(true)

    fireEntry(true)
    expect(isPinned.value).toBe(false)
  })

  it('stays pinned when paused while still out of view, like a mini-player', () => {
    const { isPinned, isPlaying } = setup(true, true)

    fireEntry(false)
    expect(isPinned.value).toBe(true)

    isPlaying.value = false
    expect(isPinned.value).toBe(true)
  })

  it('disconnects the observer on unmount', () => {
    const { wrapper } = setup(true, true)
    wrapper.unmount()
    expect(disconnectSpy).toHaveBeenCalledOnce()
  })
})
