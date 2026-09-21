type PauseFn = () => void

const registry = new Set<PauseFn>()

export function registerPauseHandler(fn: PauseFn): () => void {
  registry.add(fn)
  return () => registry.delete(fn)
}

export function pauseOthers(except: PauseFn): void {
  registry.forEach((fn) => {
    if (fn === except) return
    try {
      fn()
    } catch (_) {}
  })
}
