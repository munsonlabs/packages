import { createEmitter } from '@/composables/player/emitter'
import { loadScript } from '@/utils/loadScript'
import {
  createEmbedMount,
  teardownEmbedMount,
  spawnIosFullscreenOverlay,
  createTimerScheduler,
  enterFullscreenWithIosFallback,
  EMBED_UNSUPPORTED_FEATURES,
} from '@/adapters/embeds/embedShared'
import type { EmbedAdapterOptions } from '@/types/playback'
import type { PlaybackAdapter, MediaErrorLike } from '@/types/playback'
import { exitFullscreen } from '@/utils/platform'
import { YOUTUBE_TIMEUPDATE_POLL_MS, MUTE_VOLUMECHANGE_SYNC_DELAY_MS, MVP_YOUTUBE_CLASS } from '@/constants'

interface ParsedUrl {
  videoId: string | null
  listId: string | null
}

function isPlayingOrBuffering(YT: YTNamespace, state: number | null): boolean {
  return state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING
}

function parseUrl(url: string): ParsedUrl {
  const result: ParsedUrl = { videoId: null, listId: null }
  const videoRx = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|&v=)([^#&?]*).*/
  const m = url.match(videoRx)
  if (m?.[2]?.length === 11) result.videoId = m[2]

  const listM = url.match(/[?&]list=([^#&?]+)/)
  if (listM?.[1]) result.listId = listM[1]

  return result
}

const YOUTUBE_API_URL = 'https://www.youtube.com/iframe_api'

let readyApi: YTNamespace | null = null
let apiLoading: Promise<YTNamespace> | null = null

/** A failed load rejects every waiting adapter and clears the in-flight promise, so a Retry starts a fresh attempt. */
function ensureApiLoaded(): Promise<YTNamespace> {
  if (readyApi) return Promise.resolve(readyApi)
  if (!apiLoading) {
    apiLoading = loadScript(YOUTUBE_API_URL).then(
      () =>
        new Promise<YTNamespace>((resolve, reject) => {
          const YT = window.YT
          if (!YT) {
            reject(new Error('The YouTube player failed to load.'))
            return
          }
          YT.ready(() => {
            readyApi = YT
            resolve(YT)
          })
        }),
    )
    apiLoading.catch(() => {
      apiLoading = null
    })
  }
  return apiLoading
}

export function createYoutubeAdapter(videoEl: HTMLVideoElement, options: EmbedAdapterOptions): PlaybackAdapter {
  const emitter = createEmitter()
  const { techId, wrapper } = createEmbedMount(videoEl, MVP_YOUTUBE_CLASS, options.nativeUi)

  const url = parseUrl(options.src)
  let ytPlayer: YTPlayer | null = null
  let activeVideoId: string | null = url.videoId
  let playerReady = false
  let playOnReady = false
  let cueOnReady = false
  let lastState: number | null = null
  let adWasPlaying = false
  let errorNumber: number | null = null
  let loadError: MediaErrorLike | null = null
  let disposed = false
  let hasPlaybackRateFeature = false
  const { schedule, clearAll: clearTimers } = createTimerScheduler()
  let startInterval: ReturnType<typeof setInterval> | null = null

  /** Tracks a seek issued while paused — the IFrame API fires no event for it actually landing. */
  const seek = {
    active: false,
    wasPaused: false,
    timeBefore: 0,
    catchUpInterval: null as ReturnType<typeof setInterval> | null,
  }

  function isAdPlaying(): boolean {
    try {
      const placements = ytPlayer?.getPlayerResponse()?.adPlacements
      return Array.isArray(placements) && placements.length > 0
    } catch {
      return false
    }
  }

  function loadVideoById(id: string): void {
    ytPlayer?.loadVideoById({ videoId: id })
  }

  function cueVideoById(id: string): void {
    ytPlayer?.cueVideoById({ videoId: id })
  }

  function play(): Promise<void> {
    if (!url.videoId) return Promise.resolve()
    seek.wasPaused = false

    if (playerReady) {
      if (activeVideoId === url.videoId) {
        ytPlayer?.playVideo()
      } else {
        loadVideoById(url.videoId)
        activeVideoId = url.videoId
      }
    } else {
      emitter.trigger('waiting')
      playOnReady = true
    }
    return Promise.resolve()
  }

  function onSeeked(): void {
    if (seek.catchUpInterval) clearInterval(seek.catchUpInterval)
    seek.active = false
    if (seek.wasPaused) ytPlayer?.pauseVideo()
    emitter.trigger('seeked')
  }

  function onPlayerReady(): void {
    const rates = ytPlayer?.getAvailablePlaybackRates() ?? []
    hasPlaybackRateFeature = rates.length > 1

    playerReady = true

    /** `playerVars.mute` isn't reliably respected - mute via the real mute() call before any autoplay. */
    if (options.muted) ytPlayer?.mute()
    if (options.volume !== undefined) ytPlayer?.setVolume(options.volume * 100)

    if (playOnReady) void play()
    else if (cueOnReady && url.videoId) {
      cueVideoById(url.videoId)
      activeVideoId = url.videoId
    }
  }

  function onPlayerStateChange(state: number): void {
    if (state === lastState || errorNumber !== null) return
    lastState = state

    const adNow = isAdPlaying()
    if (adNow !== adWasPlaying) {
      adWasPlaying = adNow
      emitter.trigger(adNow ? 'adstart' : 'adend')
    }

    const YT = window.YT
    if (!YT) return

    switch (state) {
      case -1:
        emitter.trigger('durationchange')
        emitter.trigger('ratechange')
        break
      case YT.PlayerState.ENDED:
        emitter.trigger('ended')
        break
      case YT.PlayerState.PLAYING:
        emitter.trigger('timeupdate')
        emitter.trigger('durationchange')
        emitter.trigger('playing')
        emitter.trigger('play')
        if (seek.active) onSeeked()
        break
      case YT.PlayerState.PAUSED:
        emitter.trigger('canplay')
        if (!seek.active) emitter.trigger('pause')
        break
      case YT.PlayerState.BUFFERING:
        emitter.trigger('waiting')
        break
      case YT.PlayerState.CUED:
        emitter.trigger('canplay')
        break
    }

    if (startInterval) {
      clearInterval(startInterval)
      startInterval = null
    }
    if (state === YT.PlayerState.PLAYING) {
      startInterval = setInterval(() => emitter.trigger('timeupdate'), YOUTUBE_TIMEUPDATE_POLL_MS)
    }
  }

  function initYtPlayer(): void {
    const playerVars: Record<string, unknown> = {
      controls: options.nativeUi ? 1 : 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      mute: options.muted ? 1 : 0,
      origin: window.location.origin,
      allowfullscreen: 1,
      fullscreen: 1,
      fs: 1,
      autoplay: 0,
      playsinline: 1,
    }

    activeVideoId = url.videoId
    ytPlayer = new window.YT!.Player(techId, {
      videoId: activeVideoId ?? undefined,
      playerVars,
      events: {
        onReady: onPlayerReady,
        onStateChange: (e) => onPlayerStateChange(e.data),
        onPlaybackRateChange: () => emitter.trigger('ratechange'),
        onVolumeChange: () => emitter.trigger('volumechange'),
        onError: (e) => {
          errorNumber = e.data
          emitter.trigger('error')
          schedule(() => {
            errorNumber = null
          })
        },
      },
    })
  }

  function connect(): void {
    if (readyApi) {
      initYtPlayer()
      return
    }
    ensureApiLoaded().then(
      () => {
        if (!disposed) initYtPlayer()
      },
      (err: unknown) => {
        if (disposed) return
        loadError = { code: 4, message: err instanceof Error ? err.message : 'The YouTube player failed to load.' }
        emitter.trigger('error')
      },
    )
  }

  connect()

  if (options.autoplay) {
    if (playerReady) void play()
    else playOnReady = true
  } else if (url.videoId) {
    cueOnReady = true
  }

  function spawnIosFullscreen(): void {
    if (!ytPlayer) return
    const currentTime = ytPlayer.getCurrentTime()
    const { video_id: videoId } = ytPlayer.getVideoData()
    ytPlayer.pauseVideo()

    const { overlay, reveal, finish } = spawnIosFullscreenOverlay(emitter)
    const mount = document.createElement('div')
    mount.id = `yt-fs-${Math.random().toString(36).slice(2)}`
    overlay.appendChild(mount)

    let fsPlayer: YTPlayer | null = null
    const teardown = () => {
      document.removeEventListener('pointerdown', onPageInteraction, true)
      finish(() => {
        const resumeAt = fsPlayer?.getCurrentTime() ?? currentTime
        try {
          fsPlayer?.destroy()
        } catch {}
        ytPlayer?.seekTo(resumeAt, true)
        emitter.trigger('timeupdate')
      })
    }

    /** A page interaction only reaches us once native fullscreen has actually released the screen - that's what distinguishes a real exit from a same-state PAUSED event. */
    function onPageInteraction(): void {
      teardown()
    }

    fsPlayer = new window.YT!.Player(mount.id, {
      videoId,
      playerVars: { playsinline: 0, autoplay: 0, controls: 1, modestbranding: 1, rel: 0, start: Math.floor(currentTime) },
      events: {
        onReady: (e) => {
          reveal()
          e.target.seekTo(currentTime, true)
          e.target.playVideo()
        },
        onStateChange: (e) => {
          const YT = window.YT
          if (!YT) return
          if (e.data === YT.PlayerState.ENDED) {
            teardown()
          } else if (e.data === YT.PlayerState.PAUSED) {
            document.removeEventListener('pointerdown', onPageInteraction, true)
            document.addEventListener('pointerdown', onPageInteraction, { capture: true, once: true })
          } else {
            document.removeEventListener('pointerdown', onPageInteraction, true)
            reveal()
          }
        },
      },
    })
  }

  function enterFullscreen(): void {
    enterFullscreenWithIosFallback(videoEl, () => {
      if (!ytPlayer) return false
      spawnIosFullscreen()
    })
  }

  return {
    el: wrapper,
    play,
    pause: () => ytPlayer?.pauseVideo(),
    paused: () => {
      if (!ytPlayer) return true
      const YT = window.YT
      return !YT || !isPlayingOrBuffering(YT, lastState)
    },
    currentTime: () => (playerReady ? (ytPlayer?.getCurrentTime() ?? 0) : 0),
    setCurrentTime: (seconds) => {
      if (!playerReady || !ytPlayer) return
      const YT = window.YT
      if (YT && lastState === YT.PlayerState.PAUSED) seek.timeBefore = ytPlayer.getCurrentTime()
      if (!seek.active) seek.wasPaused = YT ? !isPlayingOrBuffering(YT, lastState) : true

      ytPlayer.seekTo(seconds, true)
      emitter.trigger('timeupdate')
      seek.active = true

      if (YT && lastState === YT.PlayerState.PAUSED && seek.timeBefore !== seconds) {
        if (seek.catchUpInterval) clearInterval(seek.catchUpInterval)
        seek.catchUpInterval = setInterval(() => {
          if (lastState !== YT.PlayerState.PAUSED || !seek.active) {
            if (seek.catchUpInterval) clearInterval(seek.catchUpInterval)
          } else if (ytPlayer && ytPlayer.getCurrentTime() !== seek.timeBefore) {
            emitter.trigger('timeupdate')
            onSeeked()
          }
        }, YOUTUBE_TIMEUPDATE_POLL_MS)
      }
    },
    duration: () => (playerReady ? (ytPlayer?.getDuration() ?? 0) : 0),
    volume: () => (playerReady && ytPlayer ? ytPlayer.getVolume() / 100 : 1),
    setVolume: (vol) => {
      if (playerReady) ytPlayer?.setVolume(vol * 100)
    },
    muted: () => (playerReady ? (ytPlayer?.isMuted() ?? false) : false),
    setMuted: (mute) => {
      if (!playerReady || !ytPlayer) return
      if (mute) ytPlayer.mute()
      else ytPlayer.unMute()
      schedule(() => emitter.trigger('volumechange'), MUTE_VOLUMECHANGE_SYNC_DELAY_MS)
    },
    playbackRate: () => (playerReady ? (ytPlayer?.getPlaybackRate() ?? 1) : 1),
    setPlaybackRate: (rate) => {
      if (playerReady) ytPlayer?.setPlaybackRate(rate)
    },
    bufferedEnd: () => {
      if (!playerReady || !ytPlayer?.getVideoLoadedFraction) return 0
      return ytPlayer.getVideoLoadedFraction() * ytPlayer.getDuration()
    },
    error: (): MediaErrorLike | null =>
      loadError ?? (errorNumber !== null ? { code: errorNumber, message: 'This video could not be played.' } : null),
    setSrc: (src) => {
      const newUrl = parseUrl(src)
      url.videoId = newUrl.videoId
      url.listId = newUrl.listId
      if (!url.videoId) return
      if (loadError) {
        loadError = null
        if (!options.autoplay) cueOnReady = true
        connect()
        return
      }
      if (playerReady) {
        loadVideoById(url.videoId)
        activeVideoId = url.videoId
      } else {
        cueOnReady = true
      }
    },
    supportsPlaybackRate: () => hasPlaybackRateFeature,
    ...EMBED_UNSUPPORTED_FEATURES,
    enterFullscreen,
    exitFullscreen,
    on: emitter.on,
    off: emitter.off,
    dispose: () => {
      disposed = true
      clearTimers()
      if (startInterval) clearInterval(startInterval)
      if (seek.catchUpInterval) clearInterval(seek.catchUpInterval)
      if (ytPlayer) {
        try {
          ytPlayer.stopVideo()
          ytPlayer.destroy()
        } catch {}
      }
      ytPlayer = null
      teardownEmbedMount(videoEl, wrapper, MVP_YOUTUBE_CLASS)
      emitter.dispose()
    },
  }
}
