import { describe, it, expect, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { createPlayerControls } from '@/ui/player/createPlayerControls'
import { createPlayerState } from '@/ui/player/playerState'
import type { AdSetup } from '@/ui/player/features/createAdSetup'
import type { PlaybackAdapter } from '@/types/playback'

function makeAdapter(overrides: Partial<PlaybackAdapter> = {}): PlaybackAdapter {
  return {
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    paused: () => false,
    ...overrides,
  } as unknown as PlaybackAdapter
}

const noAds = { isAdPlaying: () => false, isAdPaused: () => false, pauseAd: vi.fn(), resumeAd: vi.fn() } as unknown as AdSetup

function setup(adapter: PlaybackAdapter | null, isPlaying = ref(false), isReady = ref(true)) {
  const state = createPlayerState({ src: 'https://example.com/a.mp4' })
  state.isPlaying = isPlaying
  state.isReady = isReady
  state.duration.value = 100
  const controls = createPlayerControls(state, () => adapter, noAds, vi.fn())
  return { controls, isPlaying, state }
}

describe('play after an immediately preceding pause', () => {
  it('plays even though isPlaying has not caught up yet', async () => {
    const adapter = makeAdapter({ paused: () => true, on: vi.fn(), off: vi.fn() })
    const { controls } = setup(adapter, ref(true))

    void controls.play()

    expect(adapter.play).toHaveBeenCalledOnce()
  })

  it('still skips a redundant play while the element really is playing', async () => {
    const adapter = makeAdapter({ paused: () => false })
    const { controls } = setup(adapter, ref(true))

    await controls.play()

    expect(adapter.play).not.toHaveBeenCalled()
  })
})

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
