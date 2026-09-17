import { describe, it, expect, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { usePlayerControls } from '@/composables/player/usePlayerControls'
import { createPlayerState } from '@/composables/player/playerState'
import type { UseAdSetupReturn } from '@/composables/player/features/useAdSetup'
import type { PlaybackAdapter } from '@/types/playback'

function makeAdapter(overrides: Partial<PlaybackAdapter> = {}): PlaybackAdapter {
  return {
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    paused: () => false,
    ...overrides,
  } as unknown as PlaybackAdapter
}

const noAds = { isAdPlaying: () => false, isAdPaused: () => false, pauseAd: vi.fn(), resumeAd: vi.fn() } as unknown as UseAdSetupReturn

function setup(adapter: PlaybackAdapter | null, isPlaying = ref(false), isReady = ref(true)) {
  const state = createPlayerState({ src: 'https://example.com/a.mp4' })
  state.isPlaying = isPlaying
  state.isReady = isReady
  state.total.value = 100
  const controls = usePlayerControls(state, () => adapter, noAds, vi.fn())
  return { controls, isPlaying, state }
}

describe('togglePlay', () => {
  it('calls play() when isPlaying is false', () => {
    const adapter = makeAdapter()
    const { controls } = setup(adapter, ref(false))
    controls.togglePlay()
    expect(adapter.play).toHaveBeenCalledOnce()
    expect(adapter.pause).not.toHaveBeenCalled()
  })

  it('calls pause() when isPlaying is true', () => {
    const adapter = makeAdapter()
    const { controls } = setup(adapter, ref(true))
    controls.togglePlay()
    expect(adapter.pause).toHaveBeenCalledOnce()
    expect(adapter.play).not.toHaveBeenCalled()
  })

  it('does not call pause() while a play() is in flight but isPlaying has not caught up yet', () => {
    const adapter = makeAdapter({ paused: () => false })
    const { controls } = setup(adapter, ref(false))
    controls.togglePlay()
    expect(adapter.play).toHaveBeenCalledOnce()
    expect(adapter.pause).not.toHaveBeenCalled()
  })

  it('does nothing when the player is not ready', () => {
    const adapter = makeAdapter()
    const { controls } = setup(adapter, ref(false), ref(false))
    controls.togglePlay()
    expect(adapter.play).not.toHaveBeenCalled()
    expect(adapter.pause).not.toHaveBeenCalled()
  })
})
