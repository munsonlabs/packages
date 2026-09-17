import { shallowRef, computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { PlayerContext } from '@/composables/player/playerContext'
import { PLAYER_METHOD_KEYS, PLAYER_STATE_KEYS } from '@/composables/player/playerSurface'
import type { PlayerMethodKey, PlayerStateKey } from '@/composables/player/playerSurface'

export type MethodKey = PlayerMethodKey
type StateKey = PlayerStateKey

/** Promise<void>, not void - every forwarded method goes through `guard` first, which may itself be async. */
export type ForwardedPlayer = { [K in MethodKey]: (...args: Parameters<PlayerContext[K]>) => Promise<void> } & {
  [K in StateKey]: ComputedRef<PlayerContext[K]>
}

export interface UseForwardedPlayerReturn {
  /** Bind this as the template ref on the wrapped `VideoPlayer` (`ref="playerRef"`). */
  playerRef: Ref<PlayerContext | null>
  /** Spread into (or pass directly to) the wrapper component's own `defineExpose`. */
  forwarded: ForwardedPlayer
}

/**
 * Curated forward of a template-ref'd VideoPlayer's controls/state for a wrapper's own
 * `defineExpose`. `guard` runs before every method call - return `false` to swallow it, or
 * perform a side effect before returning `true`. Owns the ref itself so the wrapper's public
 * surface never sees the raw player ref.
 */
export function useForwardedPlayer(guard: (key: MethodKey) => boolean | Promise<boolean> = () => true): UseForwardedPlayerReturn {
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
