import { shallowRef, computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { PlayerContext } from '@/player/playerContext'
import { PLAYER_METHOD_KEYS, PLAYER_STATE_KEYS } from '@/player/playerSurface'
import type { PlayerMethodKey, PlayerStateKey } from '@/player/playerSurface'

export type ForwardedPlayer = { [K in PlayerMethodKey]: (...args: Parameters<PlayerContext[K]>) => Promise<void> } & {
  [K in PlayerStateKey]: ComputedRef<PlayerContext[K]>
}

export interface UseForwardedPlayerReturn {
  playerRef: Ref<PlayerContext | null>
  forwarded: ForwardedPlayer
}

export function useForwardedPlayer(guard: (key: PlayerMethodKey) => boolean | Promise<boolean> = () => true): UseForwardedPlayerReturn {
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
