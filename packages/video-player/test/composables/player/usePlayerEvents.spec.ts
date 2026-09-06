import { describe, it, expect, vi } from 'vite-plus/test'
import { ref } from 'vue'
import type { Ref } from 'vue'
import { usePlayerEvents } from '@/composables/player/usePlayerEvents'
import { createEmitter } from '@/composables/player/emitter'
import type { PlaybackAdapter, CaptionTrackInfo, QualityLevelInfo, MediaErrorLike } from '@/types/playback'

interface FakeAdapterQuality {
  levels: Ref<QualityLevelInfo[]>
  currentIndex: Ref<number | null>
  isAuto: Ref<boolean>
}

function makeFakeAdapter(
  duration: Ref<number>,
  captionTracks: Ref<CaptionTrackInfo[]> = ref([]),
  activeCaptionTrack: Ref<number | null> = ref(null),
  quality: FakeAdapterQuality = { levels: ref([]), currentIndex: ref(null), isAuto: ref(true) },
  pip: { supported: Ref<boolean>; active: Ref<boolean> } = { supported: ref(false), active: ref(false) },
  currentTime: Ref<number> = ref(0),
  bufferedEnd: Ref<number> = ref(0),
  errorValue: Ref<MediaErrorLike | null> = ref(null),
): { adapter: PlaybackAdapter; emitter: ReturnType<typeof createEmitter> } {
  const emitter = createEmitter()
  const adapter: PlaybackAdapter = {
    el: document.createElement('div'),
    play: vi.fn(),
    pause: vi.fn(),
    paused: () => true,
    currentTime: () => currentTime.value,
    setCurrentTime: vi.fn(),
    duration: () => duration.value,
    volume: () => 1,
    setVolume: vi.fn(),
    muted: () => false,
    setMuted: vi.fn(),
    playbackRate: () => 1,
    setPlaybackRate: vi.fn(),
    bufferedEnd: () => bufferedEnd.value,
    error: () => errorValue.value,
    setSrc: vi.fn(),
    supportsPlaybackRate: () => true,
    supportsCaptions: () => captionTracks.value.length > 0,
    getCaptionTracks: () => captionTracks.value,
    setCaptionTrack: vi.fn(),
    getActiveCaptionTrack: () => activeCaptionTrack.value,
    supportsQuality: () => quality.levels.value.length > 0,
    getQualityLevels: () => quality.levels.value,
    getCurrentQuality: () => quality.currentIndex.value,
    isAutoQuality: () => quality.isAuto.value,
    setQuality: vi.fn(),
    supportsPip: () => pip.supported.value,
    isPipActive: () => pip.active.value,
    togglePip: vi.fn(),
    enterFullscreen: vi.fn(),
    exitFullscreen: vi.fn(),
    on: emitter.on,
    off: emitter.off,
    dispose: vi.fn(),
  }
  return { adapter, emitter }
}

function makeRefs() {
  return {
    isPlaying: ref(false),
    hasEnded: ref(false),
    isReady: ref(false),
    isAdPlaying: ref(false),
    isLive: ref(false),
    current: ref(0),
    total: ref(0),
    buffered: ref(0),
    vol: ref(1),
    isMuted: ref(false),
    isLooping: ref(false),
    playbackRate: ref(1),
    supportsPlaybackRate: ref(false),
    supportsCaptions: ref(false),
    captionTracks: ref<CaptionTrackInfo[]>([]),
    activeCaptionIndex: ref<number | null>(null),
    supportsQuality: ref(false),
    qualityLevels: ref<QualityLevelInfo[]>([]),
    currentQualityIndex: ref<number | null>(null),
    isAutoQuality: ref(true),
    supportsPip: ref(false),
    isPipActive: ref(false),
    hasStarted: ref(false),
    isError: ref(false),
    errorMessage: ref(''),
  }
}

function makeDeps() {
  return {
    fire: vi.fn(),
    pauseThisPlayer: vi.fn(),
    positionMemory: { restoreOnce: vi.fn(), save: vi.fn(), clear: vi.fn() },
    quartiles: { checkQuartiles: vi.fn(), reset: vi.fn() },
    buffering: { isBuffering: ref(false), attachPlayerEvents: vi.fn(), reset: vi.fn() },
    fullscreen: {
      isFullscreen: ref(false),
      isFullscreenPending: ref(false),
      toggleFullscreen: vi.fn(),
      markFullscreenPending: vi.fn(),
      attachPlayerEvents: vi.fn(),
    },
  }
}

describe('usePlayerEvents — live stream detection', () => {
  it('sets isLive and leaves total at 0 when duration is Infinity', () => {
    const refs = makeRefs()
    const { attachPlayerEvents } = usePlayerEvents(refs, makeDeps())
    const duration = ref(Infinity)
    const { adapter, emitter } = makeFakeAdapter(duration)

    attachPlayerEvents(adapter)
    emitter.trigger('durationchange')

    expect(refs.isLive.value).toBe(true)
    expect(refs.total.value).toBe(0)
  })

  it('clears isLive once a finite duration is reported', () => {
    const refs = makeRefs()
    const { attachPlayerEvents } = usePlayerEvents(refs, makeDeps())
    const duration = ref(Infinity)
    const { adapter, emitter } = makeFakeAdapter(duration)

    attachPlayerEvents(adapter)
    emitter.trigger('durationchange')
    expect(refs.isLive.value).toBe(true)

    duration.value = 120
    emitter.trigger('durationchange')

    expect(refs.isLive.value).toBe(false)
    expect(refs.total.value).toBe(120)
  })

  it('skips quartile checks on timeupdate while live', () => {
    const refs = makeRefs()
    const deps = makeDeps()
    const { attachPlayerEvents } = usePlayerEvents(refs, deps)
    const duration = ref(Infinity)
    const { adapter, emitter } = makeFakeAdapter(duration)

    attachPlayerEvents(adapter)
    emitter.trigger('durationchange')
    emitter.trigger('timeupdate')

    expect(deps.quartiles.checkQuartiles).not.toHaveBeenCalled()
  })

  it('skips position-memory restore/save on play/pause while live', () => {
    const refs = makeRefs()
    const deps = makeDeps()
    const { attachPlayerEvents } = usePlayerEvents(refs, deps)
    const duration = ref(Infinity)
    const { adapter, emitter } = makeFakeAdapter(duration)

    attachPlayerEvents(adapter)
    emitter.trigger('durationchange')
    emitter.trigger('play')
    emitter.trigger('pause')

    expect(deps.positionMemory.restoreOnce).not.toHaveBeenCalled()
    expect(deps.positionMemory.save).not.toHaveBeenCalled()
  })

  it('still runs quartiles and position memory for a normal (non-live) video', () => {
    const refs = makeRefs()
    const deps = makeDeps()
    const { attachPlayerEvents } = usePlayerEvents(refs, deps)
    const duration = ref(120)
    const { adapter, emitter } = makeFakeAdapter(duration)

    attachPlayerEvents(adapter)
    emitter.trigger('durationchange')
    emitter.trigger('play')
    emitter.trigger('timeupdate')

    expect(refs.isLive.value).toBe(false)
    expect(deps.positionMemory.restoreOnce).toHaveBeenCalled()
    expect(deps.quartiles.checkQuartiles).toHaveBeenCalled()
  })
})

describe('usePlayerEvents — ad playback through the same <video> element (iOS IMA)', () => {
  it("ignores timeupdate while an ad is playing, instead of overwriting current with the ad creative's own position", () => {
    const refs = makeRefs()
    const { attachPlayerEvents } = usePlayerEvents(refs, makeDeps())
    const duration = ref(120)
    const currentTime = ref(45)
    const { adapter, emitter } = makeFakeAdapter(duration, ref([]), ref(null), undefined, undefined, currentTime)

    attachPlayerEvents(adapter)
    emitter.trigger('timeupdate')
    expect(refs.current.value).toBe(45)

    refs.isAdPlaying.value = true
    currentTime.value = 3 // the ad creative's own position, reusing the content's <video> element on iOS
    emitter.trigger('timeupdate')

    expect(refs.current.value).toBe(45)
  })

  it('resumes tracking current as soon as the ad ends', () => {
    const refs = makeRefs()
    const { attachPlayerEvents } = usePlayerEvents(refs, makeDeps())
    const duration = ref(120)
    const currentTime = ref(45)
    const { adapter, emitter } = makeFakeAdapter(duration, ref([]), ref(null), undefined, undefined, currentTime)

    attachPlayerEvents(adapter)
    emitter.trigger('timeupdate')
    expect(refs.current.value).toBe(45)

    refs.isAdPlaying.value = true
    currentTime.value = 3
    emitter.trigger('timeupdate')
    expect(refs.current.value).toBe(45)

    refs.isAdPlaying.value = false
    currentTime.value = 46
    emitter.trigger('timeupdate')

    expect(refs.current.value).toBe(46)
  })

  it("ignores durationchange while an ad is playing, instead of overwriting total with the ad creative's own duration", () => {
    const refs = makeRefs()
    const { attachPlayerEvents } = usePlayerEvents(refs, makeDeps())
    const duration = ref(120)
    const { adapter, emitter } = makeFakeAdapter(duration)

    attachPlayerEvents(adapter)
    emitter.trigger('durationchange')
    expect(refs.total.value).toBe(120)

    refs.isAdPlaying.value = true
    duration.value = 15 // the ad creative's own duration
    emitter.trigger('durationchange')

    expect(refs.total.value).toBe(120)
  })

  it("ignores progress (buffered) while an ad is playing, instead of overwriting it with the ad creative's own buffered range", () => {
    const refs = makeRefs()
    const { attachPlayerEvents } = usePlayerEvents(refs, makeDeps())
    const duration = ref(120)
    const bufferedEnd = ref(60)
    const { adapter, emitter } = makeFakeAdapter(duration, ref([]), ref(null), undefined, undefined, ref(0), bufferedEnd)

    attachPlayerEvents(adapter)
    emitter.trigger('progress')
    expect(refs.buffered.value).toBe(50)

    refs.isAdPlaying.value = true
    bufferedEnd.value = 15
    emitter.trigger('progress')

    expect(refs.buffered.value).toBe(50)
  })
})

describe('usePlayerEvents — playback error', () => {
  it('sets isError/errorMessage/isReady and fires the error state-change event', () => {
    const refs = makeRefs()
    const deps = makeDeps()
    const { attachPlayerEvents } = usePlayerEvents(refs, deps)
    const errorValue = ref<MediaErrorLike | null>({ code: 4, message: 'MEDIA_ERR_SRC_NOT_SUPPORTED' })
    const { adapter, emitter } = makeFakeAdapter(ref(120), ref([]), ref(null), undefined, undefined, ref(0), ref(0), errorValue)

    attachPlayerEvents(adapter)
    emitter.trigger('error')

    expect(refs.isError.value).toBe(true)
    expect(refs.isReady.value).toBe(true)
    expect(refs.errorMessage.value).toBe('MEDIA_ERR_SRC_NOT_SUPPORTED')
    expect(deps.fire).toHaveBeenCalledWith('error', { error: errorValue.value })
  })

  it('falls back to a generic message when the adapter reports no error detail', () => {
    const refs = makeRefs()
    const { attachPlayerEvents } = usePlayerEvents(refs, makeDeps())
    const { adapter, emitter } = makeFakeAdapter(ref(120))

    attachPlayerEvents(adapter)
    emitter.trigger('error')

    expect(refs.errorMessage.value).toBe('This video could not be played.')
  })

  it('logs the error to the console, the same way an ad playback error already does', () => {
    const refs = makeRefs()
    const { attachPlayerEvents } = usePlayerEvents(refs, makeDeps())
    const errorValue = ref<MediaErrorLike | null>({ code: 2, message: 'MEDIA_ERR_NETWORK' })
    const { adapter, emitter } = makeFakeAdapter(ref(120), ref([]), ref(null), undefined, undefined, ref(0), ref(0), errorValue)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    attachPlayerEvents(adapter)
    emitter.trigger('error')

    expect(consoleErrorSpy).toHaveBeenCalledWith('Video playback error:', 'MEDIA_ERR_NETWORK')
    consoleErrorSpy.mockRestore()
  })
})

describe('usePlayerEvents — captions', () => {
  it('reads captionTracks/supportsCaptions from the adapter as soon as it attaches', () => {
    const refs = makeRefs()
    const { attachPlayerEvents } = usePlayerEvents(refs, makeDeps())
    const tracks = ref<CaptionTrackInfo[]>([{ index: 0, label: 'English', language: 'en' }])
    const { adapter } = makeFakeAdapter(ref(120), tracks)

    attachPlayerEvents(adapter)

    expect(refs.supportsCaptions.value).toBe(true)
    expect(refs.captionTracks.value).toEqual(tracks.value)
  })

  it('refreshes captionTracks/supportsCaptions on captionschange (e.g. an HLS manifest parsing after mount)', () => {
    const refs = makeRefs()
    const { attachPlayerEvents } = usePlayerEvents(refs, makeDeps())
    const tracks = ref<CaptionTrackInfo[]>([])
    const { adapter, emitter } = makeFakeAdapter(ref(120), tracks)

    attachPlayerEvents(adapter)
    expect(refs.supportsCaptions.value).toBe(false)

    tracks.value = [{ index: 0, label: 'English', language: 'en' }]
    emitter.trigger('captionschange')

    expect(refs.supportsCaptions.value).toBe(true)
    expect(refs.captionTracks.value).toEqual(tracks.value)
  })

  it('picks up a <track default> the browser shows on its own, without any setCaptionTrack() call', () => {
    const refs = makeRefs()
    const { attachPlayerEvents } = usePlayerEvents(refs, makeDeps())
    const tracks = ref<CaptionTrackInfo[]>([{ index: 0, label: 'English', language: 'en' }])
    const activeTrack = ref<number | null>(0)
    const { adapter } = makeFakeAdapter(ref(120), tracks, activeTrack)

    attachPlayerEvents(adapter)

    expect(refs.activeCaptionIndex.value).toBe(0)
  })

  it('re-syncs activeCaptionIndex on timeupdate, since no cross-browser event fires on a mode change', () => {
    const refs = makeRefs()
    const deps = makeDeps()
    const { attachPlayerEvents } = usePlayerEvents(refs, deps)
    const tracks = ref<CaptionTrackInfo[]>([{ index: 0, label: 'English', language: 'en' }])
    const activeTrack = ref<number | null>(null)
    const { adapter, emitter } = makeFakeAdapter(ref(120), tracks, activeTrack)

    attachPlayerEvents(adapter)
    expect(refs.activeCaptionIndex.value).toBe(null)

    activeTrack.value = 0
    emitter.trigger('timeupdate')

    expect(refs.activeCaptionIndex.value).toBe(0)
  })

  it('resets activeCaptionIndex to null once the browser stops showing any track', () => {
    const refs = makeRefs()
    const deps = makeDeps()
    const { attachPlayerEvents } = usePlayerEvents(refs, deps)
    const tracks = ref<CaptionTrackInfo[]>([{ index: 0, label: 'English', language: 'en' }])
    const activeTrack = ref<number | null>(0)
    const { adapter, emitter } = makeFakeAdapter(ref(120), tracks, activeTrack)

    attachPlayerEvents(adapter)
    expect(refs.activeCaptionIndex.value).toBe(0)

    activeTrack.value = null
    emitter.trigger('timeupdate')

    expect(refs.activeCaptionIndex.value).toBe(null)
  })
})

describe('usePlayerEvents — quality', () => {
  it('reads qualityLevels/supportsQuality from the adapter as soon as it attaches', () => {
    const refs = makeRefs()
    const { attachPlayerEvents } = usePlayerEvents(refs, makeDeps())
    const levels = ref<QualityLevelInfo[]>([
      { index: 0, height: 480, bitrate: 800_000, label: '480p' },
      { index: 1, height: 1080, bitrate: 3_000_000, label: '1080p' },
    ])
    const { adapter } = makeFakeAdapter(ref(120), ref([]), ref(null), { levels, currentIndex: ref(1), isAuto: ref(true) })

    attachPlayerEvents(adapter)

    expect(refs.supportsQuality.value).toBe(true)
    expect(refs.qualityLevels.value).toEqual(levels.value)
    expect(refs.isAutoQuality.value).toBe(true)
    expect(refs.currentQualityIndex.value).toBe(1)
  })

  it('refreshes on qualitychange (e.g. hls.js MANIFEST_PARSED/LEVEL_SWITCHED forwarded by native.ts)', () => {
    const refs = makeRefs()
    const { attachPlayerEvents } = usePlayerEvents(refs, makeDeps())
    const levels = ref<QualityLevelInfo[]>([])
    const currentIndex = ref<number | null>(null)
    const isAuto = ref(true)
    const { adapter, emitter } = makeFakeAdapter(ref(120), ref([]), ref(null), { levels, currentIndex, isAuto })

    attachPlayerEvents(adapter)
    expect(refs.supportsQuality.value).toBe(false)

    levels.value = [{ index: 0, height: 720, bitrate: 1_500_000, label: '720p' }]
    currentIndex.value = 0
    emitter.trigger('qualitychange')

    expect(refs.supportsQuality.value).toBe(true)
    expect(refs.qualityLevels.value).toEqual(levels.value)
    expect(refs.currentQualityIndex.value).toBe(0)
  })

  it('reports isAutoQuality going false once a manual level is selected', () => {
    const refs = makeRefs()
    const { attachPlayerEvents } = usePlayerEvents(refs, makeDeps())
    const levels = ref<QualityLevelInfo[]>([{ index: 0, height: 720, bitrate: 1_500_000, label: '720p' }])
    const currentIndex = ref<number | null>(0)
    const isAuto = ref(true)
    const { adapter, emitter } = makeFakeAdapter(ref(120), ref([]), ref(null), { levels, currentIndex, isAuto })

    attachPlayerEvents(adapter)
    expect(refs.isAutoQuality.value).toBe(true)

    isAuto.value = false
    emitter.trigger('qualitychange')

    expect(refs.isAutoQuality.value).toBe(false)
    expect(refs.currentQualityIndex.value).toBe(0)
  })
})

describe('usePlayerEvents — captionchange/qualitychange state-change events', () => {
  it('does not fire captionchange for the initial track detection at mount, before hasStarted', () => {
    const refs = makeRefs()
    const deps = makeDeps()
    const { attachPlayerEvents } = usePlayerEvents(refs, deps)
    const activeTrack = ref<number | null>(0)
    const { adapter } = makeFakeAdapter(ref(120), ref([{ index: 0, label: 'English', language: 'en' }]), activeTrack)

    attachPlayerEvents(adapter)

    expect(deps.fire).not.toHaveBeenCalledWith('captionchange', expect.anything())
  })

  it('fires captionchange once playback has started and the active track genuinely changes', () => {
    const refs = makeRefs()
    refs.hasStarted.value = true
    const deps = makeDeps()
    const { attachPlayerEvents } = usePlayerEvents(refs, deps)
    const activeTrack = ref<number | null>(null)
    const { adapter, emitter } = makeFakeAdapter(ref(120), ref([{ index: 0, label: 'English', language: 'en' }]), activeTrack)

    attachPlayerEvents(adapter)
    activeTrack.value = 0
    emitter.trigger('timeupdate')

    expect(deps.fire).toHaveBeenCalledWith('captionchange', { captionIndex: 0 })
  })

  it('does not fire qualitychange for the initial level detection at mount, before hasStarted', () => {
    const refs = makeRefs()
    const deps = makeDeps()
    const { attachPlayerEvents } = usePlayerEvents(refs, deps)
    const levels = ref<QualityLevelInfo[]>([{ index: 0, height: 720, bitrate: 1_500_000, label: '720p' }])
    const { adapter } = makeFakeAdapter(ref(120), ref([]), ref(null), { levels, currentIndex: ref(0), isAuto: ref(true) })

    attachPlayerEvents(adapter)

    expect(deps.fire).not.toHaveBeenCalledWith('qualitychange', expect.anything())
  })

  it('fires qualitychange with the resolved index once playback has started and quality genuinely changes', () => {
    const refs = makeRefs()
    refs.hasStarted.value = true
    const deps = makeDeps()
    const { attachPlayerEvents } = usePlayerEvents(refs, deps)
    const levels = ref<QualityLevelInfo[]>([{ index: 0, height: 720, bitrate: 1_500_000, label: '720p' }])
    const currentIndex = ref<number | null>(null)
    const isAuto = ref(true)
    const { adapter, emitter } = makeFakeAdapter(ref(120), ref([]), ref(null), { levels, currentIndex, isAuto })

    attachPlayerEvents(adapter)
    currentIndex.value = 0
    isAuto.value = false
    emitter.trigger('qualitychange')

    expect(deps.fire).toHaveBeenCalledWith('qualitychange', { qualityIndex: 0 })
  })

  it('fires qualitychange with qualityIndex: null when switching back to Auto', () => {
    const refs = makeRefs()
    refs.hasStarted.value = true
    const deps = makeDeps()
    const { attachPlayerEvents } = usePlayerEvents(refs, deps)
    const levels = ref<QualityLevelInfo[]>([{ index: 0, height: 720, bitrate: 1_500_000, label: '720p' }])
    const currentIndex = ref<number | null>(0)
    const isAuto = ref(false)
    const { adapter, emitter } = makeFakeAdapter(ref(120), ref([]), ref(null), { levels, currentIndex, isAuto })

    attachPlayerEvents(adapter)
    isAuto.value = true
    emitter.trigger('qualitychange')

    expect(deps.fire).toHaveBeenCalledWith('qualitychange', { qualityIndex: null })
  })
})

describe('usePlayerEvents — Picture-in-Picture', () => {
  it('reads supportsPip/isPipActive from the adapter as soon as it attaches', () => {
    const refs = makeRefs()
    const { attachPlayerEvents } = usePlayerEvents(refs, makeDeps())
    const { adapter } = makeFakeAdapter(ref(120), ref([]), ref(null), undefined, { supported: ref(true), active: ref(true) })

    attachPlayerEvents(adapter)

    expect(refs.supportsPip.value).toBe(true)
    expect(refs.isPipActive.value).toBe(true)
  })

  it('does not fire pipchange for the initial state at mount, before hasStarted', () => {
    const refs = makeRefs()
    const deps = makeDeps()
    const { attachPlayerEvents } = usePlayerEvents(refs, deps)
    const { adapter } = makeFakeAdapter(ref(120), ref([]), ref(null), undefined, { supported: ref(true), active: ref(true) })

    attachPlayerEvents(adapter)

    expect(deps.fire).not.toHaveBeenCalledWith('pipchange', expect.anything())
  })

  it('fires pipchange once playback has started and PiP is entered/exited, including via the browser closing its own floating window', () => {
    const refs = makeRefs()
    refs.hasStarted.value = true
    const deps = makeDeps()
    const { attachPlayerEvents } = usePlayerEvents(refs, deps)
    const active = ref(false)
    const { adapter, emitter } = makeFakeAdapter(ref(120), ref([]), ref(null), undefined, { supported: ref(true), active })

    attachPlayerEvents(adapter)
    active.value = true
    emitter.trigger('pipchange')
    expect(refs.isPipActive.value).toBe(true)
    expect(deps.fire).toHaveBeenCalledWith('pipchange', { isPipActive: true })

    active.value = false
    emitter.trigger('pipchange')
    expect(refs.isPipActive.value).toBe(false)
    expect(deps.fire).toHaveBeenCalledWith('pipchange', { isPipActive: false })
  })
})
