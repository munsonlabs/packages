import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { ref, reactive, nextTick } from 'vue'
import { withSetup } from '@test/composables/withSetup'
import { mockIntersectionObserver } from '@test/helpers'
import { createEmitter } from '@/composables/player/emitter'
import type { PlaybackAdapter } from '@/types/playback'
import type { PlayerProps, StateChangeEvent } from '@/types/player'

/**
 * usePlayer resolves its adapter through mountAdapter in onMounted - swap that for a bare fake so
 * the test never touches hls.js, IMA, or a real <video>. The emitter is recreated per test: every
 * mounted player attaches its own 'ended' handler, so a stale one from an earlier test would
 * otherwise fire too.
 */
let emitter = createEmitter()
const fakeAdapter = {
  el: document.createElement('video'),
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  paused: () => true,
  currentTime: () => 0,
  setCurrentTime: vi.fn(),
  duration: () => 100,
  volume: () => 1,
  setVolume: vi.fn(),
  muted: () => false,
  setMuted: vi.fn(),
  playbackRate: () => 1,
  setPlaybackRate: vi.fn(),
  bufferedEnd: () => 0,
  error: () => null,
  setSrc: vi.fn(),
  supportsPlaybackRate: () => true,
  supportsCaptions: () => false,
  getCaptionTracks: () => [],
  setCaptionTrack: vi.fn(),
  getActiveCaptionTrack: () => null,
  supportsQuality: () => false,
  getQualityLevels: () => [],
  getCurrentQuality: () => null,
  isAutoQuality: () => true,
  setQuality: vi.fn(),
  supportsPip: () => false,
  isPipActive: () => false,
  togglePip: vi.fn(),
  enterFullscreen: vi.fn(),
  exitFullscreen: vi.fn(),
  on: (event: string | string[], fn: (...args: unknown[]) => void) => emitter.on(event, fn),
  off: (event: string, fn: (...args: unknown[]) => void) => emitter.off(event, fn),
  dispose: vi.fn(),
} as unknown as PlaybackAdapter

vi.mock('@/composables/player/useAdapterMount', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/composables/player/useAdapterMount')>()),
  mountAdapter: vi.fn(async () => ({
    status: 'mounted',
    mounted: { adapter: fakeAdapter, currentSrc: { src: 'a.mp4' }, needsReveal: false },
  })),
}))

const { usePlayer } = await import('@/composables/player/usePlayer')

beforeEach(() => {
  vi.clearAllMocks()
  emitter = createEmitter()
  mockIntersectionObserver()
})

function setup(props: Partial<PlayerProps>) {
  const reactiveProps = reactive<PlayerProps>({ src: 'https://example.com/a.mp4', ...props })
  const events: StateChangeEvent[] = []
  const videoEl = ref<HTMLVideoElement | null>(document.createElement('video'))
  const { result } = withSetup(() => usePlayer(videoEl, reactiveProps, (_name, e) => events.push(e)))
  return { player: result, props: reactiveProps, events }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('loop prop', () => {
  it('defaults to off', () => {
    const { player } = setup({})
    expect(player.isLooping.value).toBe(false)
  })

  it('starts looping when loop is true', () => {
    const { player } = setup({ loop: true })
    expect(player.isLooping.value).toBe(true)
  })

  it('restarts instead of ending when loop is set and the media ends', async () => {
    const { player, events } = setup({ loop: true })
    await flush()
    emitter.trigger('play')
    emitter.trigger('ended')

    expect(fakeAdapter.setCurrentTime).toHaveBeenCalledWith(0)
    expect(fakeAdapter.play).toHaveBeenCalled()
    expect(player.hasEnded.value).toBe(false)
    expect(events.map((e) => e.type)).not.toContain('ended')
  })

  it('tracks later changes to the prop, like toggleLoop() would', async () => {
    const { player, props, events } = setup({ loop: false })
    await flush()
    emitter.trigger('play')

    props.loop = true
    await nextTick()
    expect(player.isLooping.value).toBe(true)
    expect(events.at(-1)).toMatchObject({ type: 'loopchange', isLooping: true })

    props.loop = false
    await nextTick()
    expect(player.isLooping.value).toBe(false)
    expect(events.at(-1)).toMatchObject({ type: 'loopchange', isLooping: false })
  })

  it('does not fight toggleLoop() when the prop is left alone', async () => {
    const { player, props } = setup({ loop: true })
    player.toggleLoop()
    expect(player.isLooping.value).toBe(false)
    // An unchanged prop must not snap the state back.
    props.title = 'nudge'
    await nextTick()
    expect(player.isLooping.value).toBe(false)
  })
})
