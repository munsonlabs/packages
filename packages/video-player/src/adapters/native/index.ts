import type Hls from 'hls.js'
import type { MediaPlayerClass } from 'dashjs'
import { createEmitter } from '@/adapters/emitter'
import { createCaptionSupport } from '@/adapters/native/captionSupport'
import { createQualitySupport, type QualityEngineAdapter } from '@/adapters/native/qualitySupport'
import { createFullscreenSupport } from '@/adapters/native/fullscreenSupport'
import { createPipSupport } from '@/adapters/native/pipSupport'
import type { PlaybackAdapter, MediaErrorLike } from '@/types/playback'
import { HLS_MIME_TYPE, DASH_MIME_TYPE } from '@/constants'
import type { PreloadMode } from '@/types/player'

export const STREAM_MAX_RECOVERY_ATTEMPTS = 3

export const STREAM_RECOVERY_BASE_DELAY_MS = 1000

export interface NativeAdapterOptions {
  src: string
  type?: string
  poster?: string
  autoplay?: boolean
  muted?: boolean
  volume?: number
  playbackRate?: number
  preload?: PreloadMode
  captionLine?: number
}

const NATIVE_EVENTS = [
  'play',
  'pause',
  'ended',
  'error',
  'timeupdate',
  'durationchange',
  'progress',
  'volumechange',
  'ratechange',
  'seeked',
  'waiting',
  'playing',
  'canplay',
] as const

function hlsQualityEngine(hls: Hls): QualityEngineAdapter {
  return {
    levels: () => hls.levels.map((level, index) => ({ index, height: level.height, bitrate: level.bitrate, label: `${level.height}p` })),
    isAuto: () => hls.autoLevelEnabled,
    currentIndex: () => hls.manualLevel,
    setIndex: (index) => {
      hls.currentLevel = index ?? -1
    },
  }
}

function dashQualityEngine(player: MediaPlayerClass): QualityEngineAdapter {
  return {
    levels: () =>
      player
        .getBitrateInfoListFor('video')
        .map((info) => ({ index: info.qualityIndex, height: info.height, bitrate: info.bitrate, label: `${info.height}p` })),
    isAuto: () => player.getSettings().streaming?.abr?.autoSwitchBitrate?.video ?? true,
    currentIndex: () => player.getQualityFor('video'),
    setIndex: (index) => {
      if (index === null) {
        player.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: true } } } })
        return
      }
      player.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } })
      player.setQualityFor('video', index, true)
    },
  }
}

export function createNativeAdapter(videoEl: HTMLVideoElement, options: NativeAdapterOptions): PlaybackAdapter {
  const emitter = createEmitter()
  let hls: Hls | null = null
  let dash: MediaPlayerClass | null = null
  let disposed = false
  let pendingHlsSrc: string | null = null
  let pendingDashSrc: string | null = null
  let streamError: MediaErrorLike | null = null
  let recoveryAttempts = 0
  let recoveryTimer: ReturnType<typeof setTimeout> | null = null

  // hls.js fetches segments as soon as it attaches unless told otherwise - `preload: 'none'` holds it back until play().
  const deferHlsLoad = options.preload === 'none' && !options.autoplay
  let hlsLoadStarted = false

  async function loadHls(src: string): Promise<void> {
    const { default: HlsCtor } = await import('hls.js')
    if (disposed || pendingHlsSrc !== src) return

    // A misconfigured import map can resolve to something that isn't the real module - fall back to native playback.
    if (typeof HlsCtor?.isSupported !== 'function' || !HlsCtor.isSupported()) {
      videoEl.src = src
      if (options.autoplay) void videoEl.play().catch(() => {})
      return
    }

    hls = new HlsCtor({ liveDurationInfinity: true, autoStartLoad: !deferHlsLoad })
    hlsLoadStarted = !deferHlsLoad
    hls.loadSource(src)
    hls.attachMedia(videoEl)
    if (options.autoplay) void videoEl.play().catch(() => {})

    const HlsEvents = HlsCtor.Events
    const HlsErrorTypes = HlsCtor.ErrorTypes

    hls.on(HlsEvents.MANIFEST_PARSED, forwardEvent('qualitychange'))
    hls.on(HlsEvents.LEVEL_SWITCHED, forwardEvent('qualitychange'))

    hls.on(HlsEvents.FRAG_BUFFERED, () => {
      recoveryAttempts = 0
    })

    hls.on(HlsEvents.ERROR, (_event, data) => {
      if (!data.fatal || disposed || pendingHlsSrc !== src) return
      const recoverable = data.type === HlsErrorTypes.NETWORK_ERROR || data.type === HlsErrorTypes.MEDIA_ERROR
      if (!recoverable || recoveryAttempts >= STREAM_MAX_RECOVERY_ATTEMPTS) {
        failStream(data.reason || data.details || 'This video could not be played.')
        return
      }
      /** Backs off between tries: a dead manifest used to retry forever, leaving the player buffering with no error. */
      const delay = STREAM_RECOVERY_BASE_DELAY_MS * 2 ** recoveryAttempts
      recoveryAttempts += 1
      clearRecoveryTimer()
      recoveryTimer = setTimeout(() => {
        if (disposed || pendingHlsSrc !== src || !hls) return
        if (data.type === HlsErrorTypes.NETWORK_ERROR) hls.startLoad()
        else hls.recoverMediaError()
      }, delay)
    })
  }

  async function loadDash(src: string): Promise<void> {
    const dashjs = await import('dashjs')
    if (disposed || pendingDashSrc !== src) return

    const player = dashjs.MediaPlayer().create()
    dash = player
    player.initialize(videoEl, src, options.autoplay ?? false)

    const Events = dashjs.MediaPlayer.events
    player.on(Events.QUALITY_CHANGE_RENDERED, forwardEvent('qualitychange'))
    player.on(Events.STREAM_INITIALIZED, forwardEvent('qualitychange'))
    player.on(Events.ERROR, () => {
      if (disposed || pendingDashSrc !== src) return
      player.destroy()
      dash = null
      failStream('This video could not be played.')
    })
  }

  // Prefer Safari's native HLS over hls.js when available
  function supportsNativeHls(): boolean {
    const isSafari = /Apple/.test(navigator.vendor) && !/CriOS|FxiOS|OPiOS|EdgiOS|Chrome|Chromium|Android/.test(navigator.userAgent)
    return isSafari && (videoEl.canPlayType('application/vnd.apple.mpegurl') !== '' || videoEl.canPlayType(HLS_MIME_TYPE) !== '')
  }

  function clearRecoveryTimer(): void {
    if (recoveryTimer) clearTimeout(recoveryTimer)
    recoveryTimer = null
  }

  function failStream(message: string): void {
    clearRecoveryTimer()
    hls?.destroy()
    hls = null
    streamError = { code: 4, message }
    emitter.trigger('error')
  }

  let loadedSrc = ''
  let loadedType: string | undefined

  function load(src: string, type?: string): void {
    loadedSrc = src
    loadedType = type
    clearRecoveryTimer()
    streamError = null
    recoveryAttempts = 0
    hls?.destroy()
    hls = null
    pendingHlsSrc = null
    dash?.destroy()
    dash = null
    pendingDashSrc = null

    if (type === DASH_MIME_TYPE) {
      pendingDashSrc = src
      void loadDash(src)
      return
    }
    if (type === HLS_MIME_TYPE && !supportsNativeHls()) {
      pendingHlsSrc = src
      void loadHls(src)
      return
    }
    videoEl.src = src
    if (options.autoplay) void videoEl.play().catch(() => {})
  }

  const forwardEvent = (name: string) => () => emitter.trigger(name)
  const forwarders = NATIVE_EVENTS.map((name) => [name, forwardEvent(name)] as const)
  for (const [name, fn] of forwarders) videoEl.addEventListener(name, fn)

  const captionSupport = createCaptionSupport(videoEl, forwardEvent('captionschange'), options.captionLine)
  const qualitySupport = createQualitySupport(() => {
    if (hls) return hlsQualityEngine(hls)
    if (dash) return dashQualityEngine(dash)
    return null
  })
  const fullscreenSupport = createFullscreenSupport(videoEl, forwardEvent('nativefullscreenenter'), forwardEvent('nativefullscreenexit'))
  const pipSupport = createPipSupport(videoEl, forwardEvent('pipchange'))

  const { poster, muted, autoplay, volume, playbackRate, preload, src, type } = options
  videoEl.poster = poster ?? ''
  if (preload) videoEl.preload = preload
  videoEl.muted = muted ?? autoplay ?? false
  videoEl.volume = volume ?? 1
  videoEl.playbackRate = playbackRate ?? 1
  videoEl.playsInline = true
  load(src, type)

  return {
    el: videoEl,
    play: () => {
      if (hls && !hlsLoadStarted) {
        hlsLoadStarted = true
        hls.startLoad()
      }
      return videoEl.play()
    },
    pause: () => videoEl.pause(),
    paused: () => videoEl.paused,
    currentTime: () => videoEl.currentTime,
    setCurrentTime: (seconds) => {
      videoEl.currentTime = seconds
    },
    duration: () => videoEl.duration,
    volume: () => videoEl.volume,
    setVolume: (vol) => {
      videoEl.volume = vol
    },
    muted: () => videoEl.muted,
    setMuted: (muted) => {
      videoEl.muted = muted
    },
    playbackRate: () => videoEl.playbackRate,
    setPlaybackRate: (rate) => {
      videoEl.playbackRate = rate
    },
    bufferedEnd: () => {
      const { buffered, duration } = videoEl
      if (!buffered.length) return 0
      const end = buffered.end(buffered.length - 1)
      return duration && end > duration ? duration : end
    },
    error: (): MediaErrorLike | null => {
      const err = videoEl.error
      if (err) return { code: err.code, message: err.message || 'This video could not be played.' }
      return streamError
    },
    load,
    retry: () => load(loadedSrc, loadedType),
    supportsPlaybackRate: () => true,
    captions: {
      tracks: captionSupport.getCaptionTracks,
      active: captionSupport.getActiveCaptionTrack,
      select: captionSupport.setCaptionTrack,
    },
    quality: {
      levels: qualitySupport.getQualityLevels,
      current: qualitySupport.getCurrentQuality,
      isAuto: qualitySupport.isAutoQuality,
      select: qualitySupport.setQuality,
    },
    pip: {
      isSupported: pipSupport.supportsPip,
      isActive: pipSupport.isPipActive,
      toggle: pipSupport.togglePip,
    },
    enterFullscreen: fullscreenSupport.enterFullscreen,
    exitFullscreen: fullscreenSupport.exitFullscreen,
    on: emitter.on,
    off: emitter.off,
    dispose: () => {
      disposed = true
      clearRecoveryTimer()
      hls?.destroy()
      dash?.destroy()
      for (const [name, fn] of forwarders) videoEl.removeEventListener(name, fn)
      captionSupport.dispose()
      fullscreenSupport.dispose()
      pipSupport.dispose()
      emitter.dispose()
    },
  }
}
