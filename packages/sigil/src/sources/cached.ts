import type { IconRequest, IconSource, ResolvedIcon } from '../types/index'

/**
 * The cache key for a request. Serialising the pair keeps the boundary between name and variant
 * structural, so `bell-ring` + `active` and `bell` + `ring-active` stay distinct even though a plain
 * join with a separator would make them the same string.
 */
function key({ name, variant }: IconRequest): string {
  return JSON.stringify([name, variant ?? null])
}

/**
 * Wraps a source so that whatever it resolves is remembered per name and variant and served
 * synchronously from then on. This is the caching `svgLibrary` has, made available to any source.
 *
 * Concurrent requests for the same icon share one resolution, so ten elements mounting at once cause
 * one fetch. Neither failures nor "not mine" answers are remembered, so a transient error retries on
 * the next request and a name the source cannot answer is asked again in case it can later. Disposing
 * the wrapper empties the cache and disposes the wrapped source.
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
      if (hit) {
        return hit
      }
      if (!source.resolve) {
        return undefined
      }

      let promise = pending.get(k)
      if (!promise) {
        promise = source
          .resolve(request)
          .then((icon) => {
            if (icon) {
              icons.set(k, icon)
            }
            return icon
          })
          .finally(() => {
            pending.delete(k)
          })
        pending.set(k, promise)
      }
      return promise
    },

    dispose() {
      icons.clear()
      pending.clear()
      source.dispose?.()
    },
  }
}
