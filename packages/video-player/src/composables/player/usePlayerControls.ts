import type { PlaybackAdapter } from '@/types/playback'
import type { StateChangeEvent, StateChangeType } from '@/types/player'
import type { PlayerState } from '@/composables/player/playerState'
import type { UseAdSetupReturn } from '@/composables/player/features/useAdSetup'
import { saveAndTrackAudioPreference } from '@/utils/audioPreference'

export interface UsePlayerControlsReturn {
  play: () => Promise<void>
  pause: () => void
  replay: () => Promise<void>
  togglePlay: () => void
  seek: (percent: number) => void
  seekTo: (seconds: number) => void
  toggleMute: () => void
  setVolume: (vol: number) => void
  toggleLoop: () => void
  setPlaybackRate: (rate: number) => void
  setCaptionTrack: (index: number | null) => void
  setQuality: (index: number | null) => void
  togglePip: () => void
}

export function usePlayerControls(
  state: PlayerState,
  getPlayer: () => PlaybackAdapter | null,
  adSetup: UseAdSetupReturn,
  fire: (type: StateChangeType, extras?: Partial<StateChangeEvent>) => void,
): UsePlayerControlsReturn {
  const {
    isPlaying,
    isReady,
    hasEnded,
    hasStarted,
    total,
    isLooping,
    currentPlaybackRate,
    activeCaptionIndex,
    currentQualityIndex,
    isAutoQuality,
    errorMessage,
  } = state

  function play(): Promise<void> {
    if (adSetup.isAdPlaying()) {
      adSetup.resumeAd()
      return Promise.resolve()
    }
    const player = getPlayer()
    if (!player) return Promise.reject(new Error('Player is not mounted'))
    if (isPlaying.value) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const settle = () => {
        player.off('playing', onPlaying)
        player.off('error', onError)
      }

      const onPlaying = () => {
        settle()
        resolve()
      }

      const onError = () => {
        settle()
        reject(new Error(errorMessage.value || 'Playback failed'))
      }

      player.on('playing', onPlaying)
      player.on('error', onError)
      player.play().catch((err: unknown) => {
        settle()
        reject(err)
      })
    })
  }

  function pause(): void {
    if (adSetup.isAdPlaying()) {
      adSetup.pauseAd()
      return
    }
    getPlayer()?.pause()
  }

  function replay(): Promise<void> {
    getPlayer()?.setCurrentTime(0)
    hasEnded.value = false
    return play()
  }

  /** Branches on reactive isPlaying, not the adapter's raw paused(): that flips before play()'s promise settles and a double-click would then pause() mid-flight. */
  function togglePlay(): void {
    if (adSetup.isAdPlaying()) {
      if (adSetup.isAdPaused()) adSetup.resumeAd()
      else adSetup.pauseAd()
      return
    }
    const player = getPlayer()
    if (!player || !isReady.value) return
    if (isPlaying.value) player.pause()
    else void player.play().catch(() => {})
  }

  function seek(percent: number): void {
    getPlayer()?.setCurrentTime(total.value * (percent / 100))
  }

  function seekTo(seconds: number): void {
    const max = total.value || Infinity
    getPlayer()?.setCurrentTime(Math.min(Math.max(seconds, 0), max))
  }

  /** Persisted so the next player starts the same way; an unmute here also lifts the forced-mute rule for later gesture-less autoplay this session. */
  function toggleMute(): void {
    const player = getPlayer()
    if (!player) return
    const muted = !player.muted()
    player.setMuted(muted)
    saveAndTrackAudioPreference({ muted, volume: player.volume() })
  }

  function setVolume(vol: number): void {
    const player = getPlayer()
    if (!player) return
    const muted = vol === 0
    player.setVolume(vol)
    player.setMuted(muted)
    saveAndTrackAudioPreference({ muted, volume: vol })
  }

  function toggleLoop(): void {
    isLooping.value = !isLooping.value
    if (hasStarted.value) fire('loopchange', { isLooping: isLooping.value })
  }

  function setPlaybackRate(rate: number): void {
    const player = getPlayer()
    if (!player) return
    player.setPlaybackRate(rate)
    currentPlaybackRate.value = rate
  }

  function setCaptionTrack(index: number | null): void {
    getPlayer()?.setCaptionTrack(index)
    activeCaptionIndex.value = index
    if (hasStarted.value) fire('captionchange', { captionIndex: index })
  }

  function setQuality(index: number | null): void {
    getPlayer()?.setQuality(index)
    currentQualityIndex.value = index
    isAutoQuality.value = index === null
    if (hasStarted.value) fire('qualitychange', { qualityIndex: index })
  }

  function togglePip(): void {
    getPlayer()?.togglePip()
  }

  return { play, pause, replay, togglePlay, seek, seekTo, toggleMute, setVolume, toggleLoop, setPlaybackRate, setCaptionTrack, setQuality, togglePip }
}
