import { computed, inject, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { PlayerKey } from '@/player/playerContext'
import type { PlayerHandle } from '@/types/player'

export interface ResolvedPlayerProps {
  player?: PlayerHandle | null
  for?: string
}

function isPlayerHandle(value: unknown): value is PlayerHandle {
  return typeof (value as PlayerHandle | null)?.togglePlay === 'function'
}

/**
 * Finds the player a control drives, in the order a reader would expect: an explicit `player` prop,
 * then `<label for>` style by element id, then the enclosing `<VideoPlayer>`. The last one is why a
 * control nested in a player needs no wiring at all; without it such a control rendered dead.
 */
export function useResolvedPlayer(props: ResolvedPlayerProps): ComputedRef<PlayerHandle | null> {
  const injected = inject(PlayerKey, null)
  const byId = shallowRef<PlayerHandle | null>(null)
  let observer: MutationObserver | null = null
  let cancelled = false

  function stopObserving(): void {
    observer?.disconnect()
    observer = null
  }

  function attempt(id: string): boolean {
    const el = document.getElementById(id)
    if (!isPlayerHandle(el)) return false
    byId.value = el
    stopObserving()
    return true
  }

  function resolveById(): void {
    stopObserving()
    byId.value = null
    const id = props.for
    if (!id || cancelled) return
    if (attempt(id)) return

    const tagName = document.getElementById(id)?.tagName.toLowerCase()
    if (tagName?.includes('-')) {
      void customElements.whenDefined(tagName).then(() => {
        if (!cancelled && props.for === id) attempt(id)
      })
    }

    void nextTick(() => {
      if (cancelled || props.for !== id || byId.value) return
      if (attempt(id)) return
      observer = new MutationObserver(() => attempt(id))
      observer.observe(document.body, { childList: true, subtree: true })
    })
  }

  onMounted(resolveById)
  watch(() => props.for, resolveById)

  onBeforeUnmount(() => {
    cancelled = true
    stopObserving()
  })

  return computed(() => props.player ?? byId.value ?? injected ?? null)
}
