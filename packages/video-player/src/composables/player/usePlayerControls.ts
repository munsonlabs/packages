import type { Ref } from 'vue'
import type { PlaybackAdapter } from '@/types/playback'
import { saveAndTrackAudioPreference } from '@/utils/audioPreference'

export interface UsePlayerControlsReturn {
  togglePlay: () => void
  seek: (val: number) => void
  toggleMute: () => void
  setVolume: (val: number) => void
  toggleLoop: () => void
  setPlaybackRate: (rate: number) => void
}

export function usePlayerControls(
  getPlayer: () => PlaybackAdapter | null,
  isReady: Ref<boolean>,
  total: Ref<number>,
  isLooping: Ref<boolean>,
  playbackRate: Ref<number>,
  isPlaying: Ref<boolean>,
): UsePlayerControlsReturn {
  /** Branches on reactive isPlaying, not the adapter's raw paused() - which flips synchronously before play()'s promise settles, risking an AbortError on a double-click. */
  function togglePlay(): void {
    const player = getPlayer()
    if (!player || !isReady.value) return
    if (!isPlaying.value) {
      void player.play()
      return
    }
    player.pause()
  }

  function seek(val: number): void {
    getPlayer()?.setCurrentTime(total.value * (val / 100))
  }

  /** Persists so the next player starts the same way, and unmuting here lifts the forced-mute rule for later gesture-less autoplay this session. */
  function toggleMute(): void {
    const player = getPlayer()
    if (!player) return
    const muted = !player.muted()
    player.setMuted(muted)
    saveAndTrackAudioPreference({ muted, volume: player.volume() })
  }

  function setVolume(val: number): void {
    const player = getPlayer()
    if (!player) return
    const muted = val === 0
    player.setVolume(val)
    player.setMuted(muted)
    saveAndTrackAudioPreference({ muted, volume: val })
  }

  function toggleLoop(): void {
    isLooping.value = !isLooping.value
  }

  function setPlaybackRate(rate: number): void {
    const player = getPlayer()
    if (!player) return
    player.setPlaybackRate(rate)
    playbackRate.value = rate
  }

  return { togglePlay, seek, toggleMute, setVolume, toggleLoop, setPlaybackRate }
}
