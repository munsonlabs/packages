type PauseFn = () => void

const registry = new Set<PauseFn>()

export function registerPauseHandler(fn: PauseFn): () => void {
  registry.add(fn)
  return () => registry.delete(fn)
}

/** A sibling player's tech may not be attached yet and can throw synchronously - don't let one broken pause() abort another's handler. */
export function pauseOthers(except: PauseFn): void {
  registry.forEach((fn) => {
    if (fn === except) return
    try {
      fn()
    } catch (_) {}
  })
}
