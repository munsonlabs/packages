import { shallowRef, computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { PlayerContext } from '@/composables/player/playerContext'
import { PLAYER_METHOD_KEYS, PLAYER_STATE_KEYS } from '@/composables/player/playerSurface'
import type { PlayerMethodKey, PlayerStateKey } from '@/composables/player/playerSurface'

/** Promise<void>, not void - every forwarded method goes through `guard` first, which may itself be async. */
export type ForwardedPlayer = { [K in PlayerMethodKey]: (...args: Parameters<PlayerContext[K]>) => Promise<void> } & {
  [K in PlayerStateKey]: ComputedRef<PlayerContext[K]>
}

export interface UseForwardedPlayerReturn {
  playerRef: Ref<PlayerContext | null>
  forwarded: ForwardedPlayer
}

export function useForwardedPlayer(guard: (key: PlayerMethodKey) => boolean | Promise<boolean> = () => true): UseForwardedPlayerReturn {
  /** shallowRef, not ref - PlayerContext's fields are already unwrapped, so there's no nested-Ref unwrapping to redo. */
  const playerRef = shallowRef<PlayerContext | null>(null)
  const forwarded: Record<string, unknown> = {}

  for (const key of PLAYER_METHOD_KEYS) {
    forwarded[key] = async (...args: unknown[]) => {
      if (!(await guard(key))) return
      await (playerRef.value?.[key] as ((...a: unknown[]) => unknown) | undefined)?.(...args)
    }
  }

  for (const key of PLAYER_STATE_KEYS) {
    forwarded[key] = computed(() => playerRef.value?.[key])
  }

  return { playerRef, forwarded: forwarded as ForwardedPlayer }
}
