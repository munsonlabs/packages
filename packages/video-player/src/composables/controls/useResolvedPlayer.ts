import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { PlayerHandle } from '@/types/player'

export interface ResolvedPlayerProps {
  player?: PlayerHandle | null
  for?: string
}

/** Resolves from the `player` prop directly, or `<label for>` style by id - safe since this package avoids shadow DOM entirely. */
export function useResolvedPlayer(player: Ref<PlayerHandle | null | undefined>, forId: Ref<string | undefined>): ComputedRef<PlayerHandle | null> {
  return computed(() => {
    if (player.value) return player.value
    if (!forId.value) return null
    return (document.getElementById(forId.value) as unknown as PlayerHandle | null) ?? null
  })
}
