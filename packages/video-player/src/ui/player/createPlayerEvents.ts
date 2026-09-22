import { pauseOthers } from '@/registries/playerRegistry'
import type { PlaybackAdapter } from '@/types/playback'
import type { PlayerState } from '@/ui/player/playerState'
import type { UseFullscreenReturn } from '@/ui/player/features/useFullscreen'
import type { UseBufferingReturn } from '@/ui/player/features/useBuffering'
import type { QuartileEvents } from '@/ui/player/features/createQuartileEvents'
import type { UsePositionMemoryReturn } from '@/ui/player/features/usePositionMemory'
import type { StateChangeEvent, StateChangeType } from '@/types/player'
import { getCaptionPreference, resolvePreferredCaptionTrack } from '@/preferences/captionPreference'

export const TIMEUPDATE_FIRE_INTERVAL_MS = 250

export interface PlayerEventsDeps {
  fire: (type: StateChangeType, extras?: Partial<StateChangeEvent>) => void
  pauseThisPlayer: () => void
  positionMemory: UsePositionMemoryReturn
  quartiles: QuartileEvents
  buffering: UseBufferingReturn
  fullscreen: UseFullscreenReturn
}

export interface PlayerEvents {
  attachPlayerEvents: (player: PlaybackAdapter) => void
}

export function createPlayerEvents(state: PlayerState, deps: PlayerEventsDeps): PlayerEvents {
  const {
    isPlaying,
    hasEnded,
    isReady,
    isAdPlaying,
    isLive,
    currentTime: current,
    duration: total,
    buffered,
    currentVolume: vol,
    isMuted,
    isLooping,
    currentPlaybackRate: playbackRate,
    supportsPlaybackRate,
    supportsCaptions,
    captionTracks,
    activeCaptionIndex,
    supportsQuality,
    qualityLevels,
    currentQualityHeight,
    isAutoQuality,
    supportsPip,
    isPipActive,
    hasStarted,
    isError,
    errorMessage,
  } = state
  const { fire, pauseThisPlayer, positionMemory, quartiles, buffering, fullscreen } = deps

  /** Embed SDKs only know supportsPlaybackRate after their own async ready callback, so it's re-read on every timeupdate. */
  function attachPlayerEvents(player: PlaybackAdapter): void {
    isReady.value = true
    supportsPlaybackRate.value = player.supportsPlaybackRate()

    /** Re-run on 'captionschange' since HLS subtitle renditions only appear once the manifest parses; hasStarted-gated so mount-time detection isn't reported as a "change". */
    /**
     * Captions are a viewer preference that outlives one player, like mute: a `<track default>` or a
     * manifest's default subtitle rendition would otherwise switch them back on for every new video,
     * undoing the viewer's choice each time they moved on.
     *
     * Enforced wherever the active track is observed rather than once at attach: the browser applies
     * `default` after the tracks themselves register, so a single early pass would run before there
     * was anything to correct. It cannot fight the viewer, because their own changes go through
     * setCaptionTrack, which updates the very preference being enforced here.
     */
    function enforceCaptionPreference(): void {
      if (!captionTracks.value.length) return
      const preferred = resolvePreferredCaptionTrack(getCaptionPreference(), captionTracks.value)
      if (preferred === undefined || preferred === player.captions?.active()) return
      player.captions?.select(preferred)
    }

    function refreshCaptionTracks(): void {
      captionTracks.value = player.captions?.tracks() ?? []
      supportsCaptions.value = captionTracks.value.length > 0
      enforceCaptionPreference()
      const active = player.captions?.active() ?? null
      if (active === activeCaptionIndex.value) return
      activeCaptionIndex.value = active
      if (hasStarted.value) fire('captionchange', { captionIndex: active })
    }

    refreshCaptionTracks()
    player.on('captionschange', refreshCaptionTracks)

    function refreshQuality(): void {
      qualityLevels.value = player.quality?.levels() ?? []
      supportsQuality.value = qualityLevels.value.length > 0
      const newIndex = player.quality?.current() ?? null
      const newAuto = player.quality?.isAuto() ?? true
      const newHeight = newAuto ? null : (qualityLevels.value.find((q) => q.index === newIndex)?.height ?? null)
      const changed = newHeight !== currentQualityHeight.value || newAuto !== isAutoQuality.value
      currentQualityHeight.value = newHeight
      isAutoQuality.value = newAuto
      if (changed && hasStarted.value) fire('qualitychange', { qualityHeight: newHeight })
    }

    refreshQuality()
    player.on('qualitychange', refreshQuality)

    function refreshPip(): void {
      supportsPip.value = player.pip?.isSupported() ?? false
      const active = player.pip?.isActive() ?? false
      if (active === isPipActive.value) return
      isPipActive.value = active
      if (hasStarted.value) fire('pipchange', { isPipActive: active })
    }

    refreshPip()
    player.on('pipchange', refreshPip)

    /** Infinity means live. Skipped while an ad plays: on iOS IMA plays the creative through this same <video>, so its duration/timeupdate would overwrite the content's. */
    const updateDuration = () => {
      if (isAdPlaying.value) return
      const d = player.duration()
      if (d === Infinity) {
        isLive.value = true
        return
      }
      isLive.value = false
      if (d && d > 0 && isFinite(d)) total.value = d
    }

    player.on('adstart', () => {
      pauseOthers(pauseThisPlayer)
      isAdPlaying.value = true
      fire('adstart')
    })

    player.on('adend', () => {
      isAdPlaying.value = false
      fire('adend')
    })

    player.on('play', () => {
      pauseOthers(pauseThisPlayer)
      hasStarted.value = true
      isPlaying.value = true
      hasEnded.value = false
      if (!isLive.value) positionMemory.restoreOnce(player)
      fire('play')
    })

    player.on('pause', () => {
      isPlaying.value = false
      if (!isLive.value) positionMemory.save(player)
      fire('pause')
    })

    player.on('ended', () => {
      isPlaying.value = false
      quartiles.reset()
      /** A 'waiting' just before 'ended' would otherwise leave isBuffering stuck true. */
      buffering.reset()
      if (isLooping.value) {
        player.setCurrentTime(0)
        void player.play().catch(() => {})
        return
      }
      if (total.value) current.value = total.value
      hasEnded.value = true
      positionMemory.clear()
      fire('ended')
    })

    player.on('seeked', () => {
      fire('seeked')
    })

    player.on('error', () => {
      const err = player.error()
      errorMessage.value = err?.message || 'This video could not be played.'
      isError.value = true
      isReady.value = true
      console.error('Video playback error:', errorMessage.value)
      fire('error', { error: err })
    })

    let lastTimeUpdateFire = 0
    player.on('timeupdate', () => {
      if (hasEnded.value || isAdPlaying.value) return
      current.value = player.currentTime() ?? 0
      if (!total.value) updateDuration()
      if (!supportsPlaybackRate.value) supportsPlaybackRate.value = player.supportsPlaybackRate()
      /** No cross-browser event fires when a TextTrack's own mode changes, so re-read - and re-assert the viewer's preference - here too. */
      enforceCaptionPreference()
      const active = player.captions?.active() ?? null
      if (activeCaptionIndex.value !== active) {
        activeCaptionIndex.value = active
        if (hasStarted.value) fire('captionchange', { captionIndex: active })
      }
      if (!isLive.value) quartiles.checkQuartiles()

      const now = Date.now()
      if (hasStarted.value && now - lastTimeUpdateFire >= TIMEUPDATE_FIRE_INTERVAL_MS) {
        lastTimeUpdateFire = now
        fire('timeupdate')
      }
    })

    player.on('durationchange', updateDuration)
    player.on('progress', () => {
      if (isAdPlaying.value) return
      const d = player.duration()
      buffered.value = d ? (player.bufferedEnd() / d) * 100 : 0
    })

    player.on('volumechange', () => {
      const muted = player.muted()
      vol.value = player.volume() ?? 1
      isMuted.value = muted ?? false
      if (hasStarted.value) fire('volumechange', { isMuted: muted })
    })

    player.on('ratechange', () => {
      const rate = player.playbackRate() ?? 1
      playbackRate.value = rate
      if (hasStarted.value) fire('ratechange', { playbackRate: rate })
    })

    buffering.attachPlayerEvents(player)
    fullscreen.attachPlayerEvents(player)
  }

  return { attachPlayerEvents }
}
