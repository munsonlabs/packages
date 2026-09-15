import { inject } from 'vue'
import type { InjectionKey, Ref, UnwrapNestedRefs } from 'vue'
import type { UsePlayerReturn } from '@/composables/player/usePlayer'
import type { UseHudReturn } from '@/composables/overlay/useHud'
import type { PlayerAction } from '@/types/player'

export type PlayerContext = UnwrapNestedRefs<UsePlayerReturn>
export type HudContext = UnwrapNestedRefs<UseHudReturn>

export const PlayerKey: InjectionKey<PlayerContext> = Symbol('player')
export const HudKey: InjectionKey<HudContext> = Symbol('hud')
export const ActionKey: InjectionKey<Ref<PlayerAction | null | undefined>> = Symbol('action')

/** Bridges VideoStage's playlist state to its controls - always provided by VideoPlayer, false/no-op when there's no playlist. */
export interface PlaylistContext {
  hasPlaylist: boolean
  hasNext: boolean
  hasPrevious: boolean
  autoAdvance: boolean
  playNext: () => void
  playPrevious: () => void
  toggleAutoAdvance: () => void
}
export const PlaylistKey: InjectionKey<PlaylistContext> = Symbol('playlist')

export function injectStrict<T>(key: InjectionKey<T>): T {
  const value = inject(key)
  if (value === undefined) {
    throw new Error(`[video-player] missing "${String(key.description)}" context — this component must be rendered inside <VideoPlayer>`)
  }
  return value
}
