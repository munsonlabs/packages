import type { UsePlayerReturn } from '@/composables/player/usePlayer'
import type { PlayerContext } from '@/composables/player/playerContext'
import type { PlayerHandle } from '@/types/player'

export const PLAYER_METHOD_KEYS = [
  'retry',
  'play',
  'pause',
  'replay',
  'togglePlay',
  'seek',
  'toggleMute',
  'setVolume',
  'toggleFullscreen',
  'toggleLoop',
  'toggleAdMute',
  'setPlaybackRate',
  'setCaptionTrack',
  'setQuality',
  'togglePip',
] as const satisfies readonly (keyof UsePlayerReturn)[]

export const PLAYER_STATE_KEYS = [
  'isPlaying',
  'hasEnded',
  'isReady',
  'isLoaded',
  'isAdPlaying',
  'isAdPaused',
  'isAdMuted',
  'adRemainingTime',
  'isLive',
  'isBuffering',
  'currentTime',
  'duration',
  'currentVolume',
  'isMuted',
  'isAudible',
  'isLooping',
  'currentPlaybackRate',
  'hasStarted',
  'isError',
  'errorMessage',
  'progress',
  'bufferedDisplay',
  'isFullscreen',
  'supportsPlaybackRate',
  'supportsCaptions',
  'captionTracks',
  'activeCaptionIndex',
  'supportsQuality',
  'qualityLevels',
  'currentQualityHeight',
  'isAutoQuality',
  'supportsPip',
  'isPipActive',
  'isNativeUi',
] as const satisfies readonly (keyof UsePlayerReturn)[]

export type PlayerMethodKey = (typeof PLAYER_METHOD_KEYS)[number]
export type PlayerStateKey = (typeof PLAYER_STATE_KEYS)[number]

export function exposePlayerSurface(player: PlayerContext): PlayerHandle {
  const surface: Record<string, unknown> = {}
  for (const key of PLAYER_METHOD_KEYS) surface[key] = (...args: unknown[]) => (player[key] as (...a: unknown[]) => unknown)(...args)
  for (const key of PLAYER_STATE_KEYS) Object.defineProperty(surface, key, { get: () => player[key], enumerable: true })
  return surface as PlayerHandle
}
