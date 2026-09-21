import { pauseOthers } from '@/composables/registries/playerRegistry'
import type { PlaybackAdapter } from '@/types/playback'
import type { PlayerState } from '@/composables/player/playerState'
import type { UseFullscreenReturn } from '@/composables/player/features/useFullscreen'
import type { UseBufferingReturn } from '@/composables/player/features/useBuffering'
import type { UseQuartileEventsReturn } from '@/composables/player/features/useQuartileEvents'
import type { UsePositionMemoryReturn } from '@/composables/player/features/usePositionMemory'
import type { StateChangeEvent, StateChangeType } from '@/types/player'
import { TIMEUPDATE_FIRE_INTERVAL_MS } from '@/constants'

export interface UsePlayerEventsDeps {
  fire: (type: StateChangeType, extras?: Partial<StateChangeEvent>) => void
  pauseThisPlayer: () => void
  positionMemory: UsePositionMemoryReturn
  quartiles: UseQuartileEventsReturn
  buffering: UseBufferingReturn
  fullscreen: UseFullscreenReturn
}

export interface UsePlayerEventsReturn {
  attachPlayerEvents: (player: PlaybackAdapter) => void
}

export function usePlayerEvents(state: PlayerState, deps: UsePlayerEventsDeps): UsePlayerEventsReturn {
  const {
    isPlaying,
    hasEnded,
    isReady,
    isAdPlaying,
    isLive,
    current,
    total,
    buffered,
    vol,
    isMuted,
    isLooping,
    currentPlaybackRate: playbackRate,
    supportsPlaybackRate,
    supportsCaptions,
    captionTracks,
    activeCaptionIndex,
    supportsQuality,
    qualityLevels,
    currentQualityIndex,
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
    function refreshCaptionTracks(): void {
      captionTracks.value = player.getCaptionTracks()
      supportsCaptions.value = captionTracks.value.length > 0
      const active = player.getActiveCaptionTrack()
      if (active === activeCaptionIndex.value) return
      activeCaptionIndex.value = active
      if (hasStarted.value) fire('captionchange', { captionIndex: active })
    }

    refreshCaptionTracks()
    player.on('captionschange', refreshCaptionTracks)

    function refreshQuality(): void {
      qualityLevels.value = player.getQualityLevels()
      supportsQuality.value = qualityLevels.value.length > 0
      const newIndex = player.getCurrentQuality()
      const newAuto = player.isAutoQuality()
      const changed = newIndex !== currentQualityIndex.value || newAuto !== isAutoQuality.value
      currentQualityIndex.value = newIndex
      isAutoQuality.value = newAuto
      if (changed && hasStarted.value) {
        const level = newAuto ? undefined : qualityLevels.value.find((q) => q.index === newIndex)
        fire('qualitychange', { qualityIndex: newAuto ? null : newIndex, qualityHeight: level?.height ?? null })
      }
    }

    refreshQuality()
    player.on('qualitychange', refreshQuality)

    function refreshPip(): void {
      supportsPip.value = player.supportsPip()
      const active = player.isPipActive()
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
      /** No cross-browser event fires when a TextTrack's own mode changes, so re-read here too. */
      const active = player.getActiveCaptionTrack()
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
