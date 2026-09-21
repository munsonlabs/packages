import type { PlaybackAdapter } from '@/types/playback'
import type { StateChangeEvent, StateChangeType } from '@/types/player'
import type { PlayerState } from '@/player/playerState'
import type { AdSetup } from '@/player/features/createAdSetup'
import { saveAndTrackAudioPreference } from '@/utils/audioPreference'

export interface PlayerControls {
  play: () => Promise<void>
  pause: () => void
  replay: () => Promise<void>
  togglePlay: () => void
  seek: (seconds: number) => void
  toggleMute: () => void
  setVolume: (vol: number) => void
  toggleLoop: () => void
  setPlaybackRate: (rate: number) => void
  setCaptionTrack: (index: number | null) => void
  setQuality: (height: number | null) => void
  togglePip: () => void
}

export function createPlayerControls(
  state: PlayerState,
  getPlayer: () => PlaybackAdapter | null,
  adSetup: AdSetup,
  fire: (type: StateChangeType, extras?: Partial<StateChangeEvent>) => void,
): PlayerControls {
  const {
    isPlaying,
    isReady,
    hasEnded,
    hasStarted,
    duration: total,
    isLooping,
    currentPlaybackRate,
    activeCaptionIndex,
    currentQualityHeight,
    isAutoQuality,
    qualityLevels,
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

  /** Seconds, like every other time in this API - the percentage form it used to take is the scrubber's unit, not a player's. */
  function seek(seconds: number): void {
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
    getPlayer()?.captions?.select(index)
    activeCaptionIndex.value = index
    if (hasStarted.value) fire('captionchange', { captionIndex: index })
  }

  /** Heights are the public unit for quality - they are stable, meaningful (the 720 in 720p) and, since the ladder keeps one variant per height, unique. The engine's own index stays inside the adapter. */
  function setQuality(height: number | null): void {
    const level = height === null ? null : nearestLevel(height)
    getPlayer()?.quality?.select(level?.index ?? null)
    currentQualityHeight.value = level?.height ?? null
    isAutoQuality.value = level === null
    if (hasStarted.value) fire('qualitychange', { qualityHeight: level?.height ?? null })
  }

  function nearestLevel(height: number) {
    const levels = qualityLevels.value
    if (!levels.length) return null
    return levels.reduce((best, level) => (Math.abs(level.height - height) < Math.abs(best.height - height) ? level : best))
  }

  function togglePip(): void {
    getPlayer()?.pip?.toggle()
  }

  return { play, pause, replay, togglePlay, seek, toggleMute, setVolume, toggleLoop, setPlaybackRate, setCaptionTrack, setQuality, togglePip }
}
