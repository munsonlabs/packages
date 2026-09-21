import type { IconSource } from '../types/index'
import { resolveFrom } from './lookup'

/**
 * Stands in for a library while its kind's module is still loading.
 */
export function createLazySource(loading: Promise<IconSource>, onReady: (source: IconSource) => void): [IconSource, Promise<void>] {
  let source: IconSource | undefined
  let disposed = false

  const ready = loading.then((loaded) => {
    if (disposed) return loaded.dispose?.()
    source = loaded
    onReady(loaded)
  })

  const placeholder: IconSource = {
    resolveSync(request) {
      return source?.resolveSync?.(request)
    },

    async resolve(request) {
      await ready
      return resolveFrom(source, request)
    },

    dispose() {
      disposed = true
      source?.dispose?.()
    },
  }

  return [placeholder, ready]
}
