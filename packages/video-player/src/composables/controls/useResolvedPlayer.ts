import { computed, inject, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { PlayerKey } from '@/composables/player/playerContext'
import type { PlayerHandle } from '@/types/player'

export interface ResolvedPlayerProps {
  player?: PlayerHandle | null
  for?: string
}

/**
 * An element only carries the player surface once something has put it there - Vue does that for a
 * custom element, and `exposePlayerOnElement` does it for a plain Vue player. Anything else with a
 * matching id is not a player, and returning it unchecked turned a typo into a TypeError on click.
 */
function isPlayerHandle(value: unknown): value is PlayerHandle {
  return typeof (value as PlayerHandle | null)?.togglePlay === 'function'
}

/**
 * Finds the player a control drives, in the order a reader would expect: an explicit `player` prop,
 * then `<label for>` style by element id, then the enclosing `<VideoPlayer>`. The last one is why a
 * control nested in a player needs no wiring at all; without it such a control rendered dead.
 *
 * Id lookup resolves after mount rather than inside a computed. A computed has no reactive
 * dependency on the DOM, so a control that mounted before its player - upgraded later, or handed
 * its surface a tick later - would have stayed frozen on the first answer forever.
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

    /** A custom element already in the DOM gets its surface when it upgrades, which no DOM mutation reports. */
    const tagName = document.getElementById(id)?.tagName.toLowerCase()
    if (tagName?.includes('-')) {
      void customElements.whenDefined(tagName).then(() => {
        if (!cancelled && props.for === id) attempt(id)
      })
    }

    /** Covers a player that mounts later, and a Vue player handed its surface on the next tick. */
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
