import { PAUSE_BELOW_RATIO } from '@/constants'
import { DEFAULT_PLAY_RATIO, playThresholds, reachedPlayRatio } from '@/ui/player/viewport/playRatio'

type ViewportCallback = (entry: IntersectionObserverEntry) => void

interface SharedObserver {
  observer: IntersectionObserver
  callbacks: Set<ViewportCallback>
}

const shells = new WeakMap<Element, SharedObserver>()

function getSharedObserver(shell: Element): SharedObserver {
  const existing = shells.get(shell)
  if (existing) return existing

  const callbacks = new Set<ViewportCallback>()
  const observer = new IntersectionObserver(([entry]) => callbacks.forEach((fn) => fn(entry)), {
    threshold: [PAUSE_BELOW_RATIO],
  })
  observer.observe(shell)

  const shared = { observer, callbacks }
  shells.set(shell, shared)
  return shared
}

/** Auto-pause and pinning, which both act once the shell drops below PAUSE_BELOW_RATIO, share one observer per shell. */
export function observeViewport(shell: Element, callback: ViewportCallback): () => void {
  const shared = getSharedObserver(shell)
  shared.callbacks.add(callback)

  return () => {
    shared.callbacks.delete(callback)
    if (shared.callbacks.size === 0) {
      shared.observer.disconnect()
      shells.delete(shell)
    }
  }
}

const PLAY_DEBOUNCE_MS = 150

let pendingShell: Element | null = null
let pendingTimer: ReturnType<typeof setTimeout> | null = null

function claimPlay(shell: Element, onWin: () => void): void {
  if (pendingTimer) clearTimeout(pendingTimer)
  pendingShell = shell
  pendingTimer = setTimeout(() => {
    pendingShell = null
    pendingTimer = null
    onWin()
  }, PLAY_DEBOUNCE_MS)
}

function dropClaim(shell: Element): void {
  if (pendingShell !== shell || !pendingTimer) return
  clearTimeout(pendingTimer)
  pendingShell = null
  pendingTimer = null
}

/**
 * Calls `onWin` each time `ratio` of the shell comes on screen (or as much as fits, for a shell bigger than
 * the screen). It arbitrates across every shell registered here: when several cross at once (e.g. a loose
 * grid, not a one-at-a-time scroll-snap feed), each crossing reschedules one shared timer instead of firing
 * onWin immediately, so only the last shell to cross within PLAY_DEBOUNCE_MS actually plays - avoiding a
 * visible flash of two videos playing at once before pauseOthers (playerRegistry.ts) settles it down to one.
 * Has its own observer rather than the shared one, since its thresholds depend on the ratio.
 */
export function observeViewportPriority(shell: Element, onWin: () => void, ratio = DEFAULT_PLAY_RATIO): () => void {
  let reached = false
  const observer = new IntersectionObserver(
    ([entry]) => {
      const wasReached = reached
      reached = reachedPlayRatio(entry, ratio)
      if (reached && !wasReached) claimPlay(shell, onWin)
    },
    { threshold: playThresholds(ratio) },
  )
  observer.observe(shell)

  return () => {
    dropClaim(shell)
    observer.disconnect()
  }
}
