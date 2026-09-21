import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'
import { withSetup } from '@test/withSetup'
import { useAutoPlayInView } from '@/player/viewport/useAutoPlayInView'
import type { PlaybackAdapter } from '@/types/playback'

let capturedOnWin: (() => void) | null = null
const unobserve = vi.fn()

vi.mock('@/player/viewport/viewportObserver', () => ({
  observeViewportPriority: vi.fn((_shell: Element, onWin: () => void) => {
    capturedOnWin = onWin
    return unobserve
  }),
}))

function makeAdapter(paused: boolean): PlaybackAdapter {
  return { paused: () => paused, play: vi.fn(() => Promise.resolve()), setMuted: vi.fn() } as unknown as PlaybackAdapter
}

function setup(adapter: PlaybackAdapter | null, explicitMuted?: boolean) {
  const shell = document.createElement('div')
  shell.className = 'player__shell'
  const video = document.createElement('video')
  shell.appendChild(video)
  document.body.appendChild(shell)
  const videoEl = ref<HTMLVideoElement | null>(video)

  const isFullscreen = ref(false)
  const isFullscreenPending = ref(false)
  const { wrapper } = withSetup(() => useAutoPlayInView(videoEl, () => adapter, isFullscreen, isFullscreenPending, explicitMuted))
  return { isFullscreen, isFullscreenPending, wrapper }
}

beforeEach(() => {
  capturedOnWin = null
  unobserve.mockClear()
})

describe('onWin (this player won the viewport-priority race)', () => {
  it('plays a paused player', () => {
    const adapter = makeAdapter(true)
    setup(adapter)

    capturedOnWin?.()

    expect(adapter.play).toHaveBeenCalledOnce()
  })

  it('does not call play again on an already-playing player', () => {
    const adapter = makeAdapter(false)
    setup(adapter)

    capturedOnWin?.()

    expect(adapter.play).not.toHaveBeenCalled()
  })

  it('does not play while fullscreen', () => {
    const adapter = makeAdapter(true)
    const { isFullscreen } = setup(adapter)
    isFullscreen.value = true

    capturedOnWin?.()

    expect(adapter.play).not.toHaveBeenCalled()
  })

  it('does not play while a fullscreen request is pending', () => {
    const adapter = makeAdapter(true)
    const { isFullscreenPending } = setup(adapter)
    isFullscreenPending.value = true

    capturedOnWin?.()

    expect(adapter.play).not.toHaveBeenCalled()
  })

  it('does nothing when there is no player yet', () => {
    setup(null)

    expect(() => capturedOnWin?.()).not.toThrow()
  })

  it('re-resolves muted right before playing rather than trusting whatever was set at mount', () => {
    const adapter = makeAdapter(true)
    setup(adapter, undefined)

    capturedOnWin?.()

    expect(adapter.setMuted).toHaveBeenCalledWith(true)
  })

  it('respects an explicit muted prop over the forced-mute rule', () => {
    const adapter = makeAdapter(true)
    setup(adapter, false)

    capturedOnWin?.()

    expect(adapter.setMuted).toHaveBeenCalledWith(false)
  })
})

describe('lifecycle', () => {
  it('unobserves on unmount', () => {
    const { wrapper } = setup(makeAdapter(true))

    wrapper.unmount()

    expect(unobserve).toHaveBeenCalledOnce()
  })

  it('does not observe when the video element has no .player__shell ancestor', async () => {
    const { observeViewportPriority } = await import('@/player/viewport/viewportObserver')
    vi.mocked(observeViewportPriority).mockClear()
    const videoEl = ref<HTMLVideoElement | null>(document.createElement('video'))
    const adapter = makeAdapter(true)

    withSetup(() => useAutoPlayInView(videoEl, () => adapter, ref(false), ref(false), undefined))

    expect(observeViewportPriority).not.toHaveBeenCalled()
  })
})
