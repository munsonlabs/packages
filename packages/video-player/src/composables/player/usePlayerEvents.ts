import { pauseOthers } from '@/composables/registries/playerRegistry'
import type { PlaybackAdapter } from '@/types/playback'
import type { PlayerState } from '@/composables/player/playerState'
import type { UseFullscreenReturn } from '@/composables/player/useFullscreen'
import type { UseBufferingReturn } from '@/composables/player/useBuffering'
import type { UseQuartileEventsReturn } from '@/composables/player/useQuartileEvents'
import type { UsePositionMemoryReturn } from '@/composables/player/usePositionMemory'
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

    /** Unlike captions, hls.js's 'qualitychange' fires reliably enough that no timeupdate fallback is needed. */
    function refreshQuality(): void {
      qualityLevels.value = player.getQualityLevels()
      supportsQuality.value = qualityLevels.value.length > 0
      const newIndex = player.getCurrentQuality()
      const newAuto = player.isAutoQuality()
      const changed = newIndex !== currentQualityIndex.value || newAuto !== isAutoQuality.value
      currentQualityIndex.value = newIndex
      isAutoQuality.value = newAuto
      if (changed && hasStarted.value) fire('qualitychange', { qualityIndex: newAuto ? null : newIndex })
    }
    refreshQuality()
    player.on('qualitychange', refreshQuality)

    /** Real, reliable DOM events - no timeupdate fallback needed here either. */
    function refreshPip(): void {
      supportsPip.value = player.supportsPip()
      const active = player.isPipActive()
      if (active === isPipActive.value) return
      isPipActive.value = active
      if (hasStarted.value) fire('pipchange', { isPipActive: active })
    }
    refreshPip()
    player.on('pipchange', refreshPip)

    /**
     * HLS live streams report an infinite duration - surface as isLive instead of a length.
     * Guarded on isAdPlaying: on iOS, IMA plays the ad creative through this same <video> element
     * (see the PiP-exit comment above for why) rather than a separate one, so its real
     * duration/timeupdate events fire for the ad's own timeline while it's playing - without this,
     * the content's total would get briefly overwritten with the ad's duration.
     */
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

    /** Embed techs trigger these for their own platform-native ads; native <video>'s IMA ads are wired separately in usePlayer.ts. */
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
      /** A live stream's "position" is a moving edge, not a resumable point — restoring/saving one doesn't mean anything. */
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
        void player.play()
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
    /** Same iOS shared-<video>-element reasoning as updateDuration above - this timeline is the ad's, not the content's, while an ad is playing. */
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
      /** Quartiles (25/50/75%) aren't meaningful against a live stream's ever-moving edge. */
      if (!isLive.value) quartiles.checkQuartiles()

      /** For non-Vue consumers (a raw custom element), throttled well below the adapter's own tick rate. */
      const now = Date.now()
      if (hasStarted.value && now - lastTimeUpdateFire >= TIMEUPDATE_FIRE_INTERVAL_MS) {
        lastTimeUpdateFire = now
        fire('timeupdate')
      }
    })
    player.on('durationchange', updateDuration)
    /** Same iOS shared-<video>-element reasoning as updateDuration above - this is the ad's buffered range, not the content's, while an ad is playing. */
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
