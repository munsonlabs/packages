import type { IconRequest, IconSource, ResolvedIcon } from '../types/index'

/**
 * The cache key for a request.
 */
function key({ name, variant }: IconRequest): string {
  return JSON.stringify([name, variant ?? null])
}

/**
 * Wraps a source so whatever it resolves is remembered per name and variant and served
 * synchronously from then on. Concurrent requests for the same icon share one resolution.
 */
export function cached(source: IconSource): IconSource {
  const icons = new Map<string, ResolvedIcon>()
  const pending = new Map<string, Promise<ResolvedIcon | undefined>>()

  return {
    resolveSync(request) {
      return icons.get(key(request)) ?? source.resolveSync?.(request)
    },

    async resolve(request) {
      const k = key(request)

      const hit = icons.get(k) ?? source.resolveSync?.(request)
      if (hit) return hit
      if (!source.resolve) return undefined
      let promise = pending.get(k)
      if (promise) return promise

      promise = source
        .resolve(request)
        .then((icon) => (icon && icons.set(k, icon), icon))
        .finally(() => pending.delete(k))

      pending.set(k, promise)
      return promise
    },

    dispose() {
      icons.clear()
      pending.clear()
      source.dispose?.()
    },
  }
}
