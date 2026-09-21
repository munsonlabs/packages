import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'
import { withSetup } from '@test/withSetup'
import { usePinOnScrollOut } from '@/pinned/usePinOnScrollOut'
import { mockIntersectionObserver } from '@test/helpers'

let io: ReturnType<typeof mockIntersectionObserver>

beforeEach(() => {
  io = mockIntersectionObserver()
})

const fireEntry = (inView: boolean) => io.fire(inView)

function setup(isPlayingInitial: boolean) {
  const targetEl = ref<HTMLElement | null>(document.createElement('div'))

  const isPlaying = ref(isPlayingInitial)
  const { result, wrapper } = withSetup(() => usePinOnScrollOut(targetEl, isPlaying))
  return { ...result, wrapper, isPlaying }
}

describe('usePinOnScrollOut', () => {
  it('does not observe when the target element is not mounted yet', () => {
    const targetEl = ref<HTMLElement | null>(null)
    withSetup(() => usePinOnScrollOut(targetEl, ref(true)))
    expect(io.observe).not.toHaveBeenCalled()
  })

  it('pins once the shell leaves the viewport while playing', () => {
    const { isPinned } = setup(true)

    fireEntry(false)

    expect(isPinned.value).toBe(true)
  })

  it('does not pin while paused', () => {
    const { isPinned } = setup(false)

    fireEntry(false)

    expect(isPinned.value).toBe(false)
  })

  it('unpins once the shell scrolls back into view', () => {
    const { isPinned } = setup(true)

    fireEntry(false)
    expect(isPinned.value).toBe(true)

    fireEntry(true)
    expect(isPinned.value).toBe(false)
  })

  it('stays pinned when paused while still out of view, like a mini-player', () => {
    const { isPinned, isPlaying } = setup(true)

    fireEntry(false)
    expect(isPinned.value).toBe(true)

    isPlaying.value = false
    expect(isPinned.value).toBe(true)
  })

  it('disconnects the observer on unmount', () => {
    const { wrapper } = setup(true)
    wrapper.unmount()
    expect(io.disconnect).toHaveBeenCalledOnce()
  })
})
