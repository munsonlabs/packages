import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'
import { createPlayerState } from '@/ui/player/playerState'
import { createPlayerControls } from '@/ui/player/createPlayerControls'
import { createPlayerEvents } from '@/ui/player/createPlayerEvents'
import { createEmitter } from '@/adapters/emitter'
import { saveCaptionPreference } from '@/preferences/captionPreference'
import type { PlaybackAdapter, CaptionTrackInfo } from '@/types/playback'

const TRACKS: CaptionTrackInfo[] = [
  { index: 0, label: 'English', language: 'en' },
  { index: 1, label: 'French', language: 'fr' },
]

/**
 * The adapter reports a mode change the moment a track is selected, exactly as the native one does
 * now, so the caption refresh re-enters while setCaptionTrack is still running.
 */
function makeAdapter() {
  const emitter = createEmitter()
  let active: number | null = null
  const adapter = {
    el: document.createElement('div'),
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    paused: () => true,
    currentTime: () => 0,
    setCurrentTime: vi.fn(),
    duration: () => 120,
    volume: () => 1,
    setVolume: vi.fn(),
    muted: () => false,
    setMuted: vi.fn(),
    playbackRate: () => 1,
    setPlaybackRate: vi.fn(),
    bufferedEnd: () => 0,
    error: () => null,
    load: vi.fn(),
    retry: vi.fn(),
    supportsPlaybackRate: () => true,
    captions: {
      tracks: () => TRACKS,
      active: () => active,
      select: (index: number | null) => {
        active = index
        emitter.trigger('captionschange')
      },
    },
    enterFullscreen: vi.fn(),
    exitFullscreen: vi.fn(),
    on: emitter.on,
    off: emitter.off,
    dispose: vi.fn(),
  } as unknown as PlaybackAdapter
  return { adapter, emitter }
}

function setup() {
  const state = createPlayerState({ src: 'a.m3u8' })
  const adSetup = { isAdPlaying: () => false, isAdPaused: () => false, pauseAd: vi.fn(), resumeAd: vi.fn() }
  const { adapter } = makeAdapter()
  const controls = createPlayerControls(state, () => adapter, adSetup as never, vi.fn())
  const { attachPlayerEvents } = createPlayerEvents(state, {
    fire: vi.fn(),
    pauseThisPlayer: vi.fn(),
    positionMemory: { restoreOnce: vi.fn(), save: vi.fn(), clear: vi.fn() },
    quartiles: { checkQuartiles: vi.fn(), reset: vi.fn() },
    buffering: { isBuffering: ref(false), attachPlayerEvents: vi.fn(), reset: vi.fn() },
    fullscreen: { isFullscreen: ref(false), isFullscreenPending: ref(false), toggleFullscreen: vi.fn(), attachPlayerEvents: vi.fn() },
  } as never)
  attachPlayerEvents(adapter)
  return { state, controls, adapter }
}

beforeEach(() => localStorage.clear())

describe('cycling captions by hand', () => {
  it('turns a track on even though the viewer previously turned captions off', () => {
    saveCaptionPreference({ enabled: false })
    const { state, controls, adapter } = setup()

    controls.setCaptionTrack(0)

    expect(adapter.captions!.active()).toBe(0)
    expect(state.activeCaptionIndex.value).toBe(0)
  })

  it('cycles off → English → French → off without snapping back', () => {
    const { state, controls } = setup()

    controls.setCaptionTrack(0)
    expect(state.activeCaptionIndex.value).toBe(0)

    controls.setCaptionTrack(1)
    expect(state.activeCaptionIndex.value).toBe(1)

    controls.setCaptionTrack(null)
    expect(state.activeCaptionIndex.value).toBeNull()
  })
})

describe('several renditions of one language', () => {
  it('leaves the viewer on the rendition they picked', () => {
    const state = createPlayerState({ src: 'a.m3u8' })
    const emitter = createEmitter()
    let active: number | null = null
    const duplicates: CaptionTrackInfo[] = [
      { index: 0, label: 'English', language: 'en' },
      { index: 1, label: 'English (CC)', language: 'en' },
    ]
    const adapter = {
      el: document.createElement('div'),
      supportsPlaybackRate: () => true,
      captions: {
        tracks: () => duplicates,
        active: () => active,
        select: (i: number | null) => {
          active = i
          emitter.trigger('captionschange')
        },
      },
      on: emitter.on,
      off: emitter.off,
      duration: () => 120,
      currentTime: () => 0,
      bufferedEnd: () => 0,
      error: () => null,
    } as unknown as PlaybackAdapter
    const controls = createPlayerControls(state, () => adapter, { isAdPlaying: () => false } as never, vi.fn())
    const { attachPlayerEvents } = createPlayerEvents(state, {
      fire: vi.fn(),
      pauseThisPlayer: vi.fn(),
      positionMemory: { restoreOnce: vi.fn(), save: vi.fn(), clear: vi.fn() },
      quartiles: { checkQuartiles: vi.fn(), reset: vi.fn() },
      buffering: { isBuffering: ref(false), attachPlayerEvents: vi.fn(), reset: vi.fn() },
      fullscreen: { isFullscreen: ref(false), isFullscreenPending: ref(false), toggleFullscreen: vi.fn(), attachPlayerEvents: vi.fn() },
    } as never)
    attachPlayerEvents(adapter)

    controls.setCaptionTrack(1)
    emitter.trigger('captionschange')

    expect(active).toBe(1)
  })
})
