import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'
import { withSetup } from '@test/withSetup'
import { useAutoPauseOffscreen } from '@/player/viewport/useAutoPauseOffscreen'
import type { PlaybackAdapter } from '@/types/playback'
import { mockIntersectionObserver } from '@test/helpers'

let io: ReturnType<typeof mockIntersectionObserver>

beforeEach(() => {
  io = mockIntersectionObserver()
})

function makeAdapter(paused: boolean): PlaybackAdapter {
  return { pause: vi.fn(), paused: () => paused } as unknown as PlaybackAdapter
}

const fireEntry = (inView: boolean) => io.fire(inView)

function setup(adapter: PlaybackAdapter | null) {
  const video = document.createElement('video')
  const shell = document.createElement('div')
  shell.className = 'player__shell'
  shell.appendChild(video)
  document.body.appendChild(shell)
  const videoEl = ref<HTMLVideoElement | null>(video)

  const isFullscreen = ref(false)
  const isFullscreenPending = ref(false)
  const pinWhenOutOfView = ref(false)
  withSetup(() => useAutoPauseOffscreen(videoEl, () => adapter, isFullscreen, isFullscreenPending, pinWhenOutOfView))
  return { isFullscreen, isFullscreenPending, pinWhenOutOfView }
}

describe('useAutoPauseOffscreen', () => {
  it('pauses when the shell leaves the viewport during normal playback', () => {
    const adapter = makeAdapter(false)
    setup(adapter)

    fireEntry(false)

    expect(adapter.pause).toHaveBeenCalledOnce()
  })

  it('does nothing when already paused', () => {
    const adapter = makeAdapter(true)
    setup(adapter)

    fireEntry(false)

    expect(adapter.pause).not.toHaveBeenCalled()
  })

  it('does nothing while still intersecting', () => {
    const adapter = makeAdapter(false)
    setup(adapter)

    fireEntry(true)

    expect(adapter.pause).not.toHaveBeenCalled()
  })

  it('does not pause while fullscreen', () => {
    const adapter = makeAdapter(false)
    const { isFullscreen } = setup(adapter)
    isFullscreen.value = true

    fireEntry(false)

    expect(adapter.pause).not.toHaveBeenCalled()
  })

  it('does not pause while a fullscreen request is pending', () => {
    const adapter = makeAdapter(false)
    const { isFullscreenPending } = setup(adapter)
    isFullscreenPending.value = true

    fireEntry(false)

    expect(adapter.pause).not.toHaveBeenCalled()
  })

  it('does not pause when pinWhenOutOfView is enabled - it pins instead', () => {
    const adapter = makeAdapter(false)
    const { pinWhenOutOfView } = setup(adapter)
    pinWhenOutOfView.value = true

    fireEntry(false)

    expect(adapter.pause).not.toHaveBeenCalled()
  })
})
