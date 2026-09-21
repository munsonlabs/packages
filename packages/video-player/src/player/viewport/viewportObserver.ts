type ViewportCallback = (entry: IntersectionObserverEntry) => void

interface SharedObserver {
  observer: IntersectionObserver
  callbacks: Set<ViewportCallback>
}

const shells = new WeakMap<Element, SharedObserver>()

const THRESHOLDS = [0.1, 0.5]

function getSharedObserver(shell: Element): SharedObserver {
  const existing = shells.get(shell)
  if (existing) return existing

  const callbacks = new Set<ViewportCallback>()
  const observer = new IntersectionObserver(([entry]) => callbacks.forEach((fn) => fn(entry)), { threshold: THRESHOLDS })
  observer.observe(shell)

  const shared = { observer, callbacks }
  shells.set(shell, shared)
  return shared
}

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

const PLAY_ABOVE_RATIO = 0.5
const PLAY_DEBOUNCE_MS = 150

let pendingShell: Element | null = null
let pendingTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Same shared observer as observeViewport, but arbitrates across every shell registered here: when
 * several cross >= PLAY_ABOVE_RATIO at once (e.g. a loose grid, not a one-at-a-time scroll-snap
 * feed), each crossing reschedules one shared timer instead of firing onWin immediately, so only
 * the last shell to cross within PLAY_DEBOUNCE_MS actually plays - avoiding a visible flash of two
 * videos playing at once before pauseOthers (playerRegistry.ts) settles it down to one.
 */
export function observeViewportPriority(shell: Element, onWin: () => void): () => void {
  const unobserve = observeViewport(shell, (entry) => {
    if (entry.intersectionRatio < PLAY_ABOVE_RATIO) return

    if (pendingTimer) clearTimeout(pendingTimer)
    pendingShell = shell
    pendingTimer = setTimeout(() => {
      pendingShell = null
      pendingTimer = null
      onWin()
    }, PLAY_DEBOUNCE_MS)
  })

  return () => {
    if (pendingShell === shell && pendingTimer) {
      clearTimeout(pendingTimer)
      pendingShell = null
      pendingTimer = null
    }
    unobserve()
  }
}
