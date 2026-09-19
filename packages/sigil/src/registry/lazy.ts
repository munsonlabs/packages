import type { IconSource } from '../types/index'
import { resolveFrom } from './lookup'

/**
 * Stands in for a library while its kind's module is still loading, so `register` can list the name
 * and return synchronously even though the code that answers requests has not arrived yet.
 *
 * Until the load lands, `resolveSync` answers nothing and `resolve` waits for it, so a renderer that
 * asks early gets its icon as soon as possible rather than a miss. When the load lands, `onReady`
 * receives the real source - the registry uses that moment to put the real source in the map in the
 * placeholder's place, after which the placeholder is unreachable.
 *
 * If the placeholder is disposed before the load finishes (the library was unregistered or replaced
 * meanwhile), the loaded source is disposed straight away and `onReady` is never called, so a stale
 * registration can never resurface.
 */
export function createLazySource(loading: Promise<IconSource>, onReady: (source: IconSource) => void): [IconSource, Promise<void>] {
  let source: IconSource | undefined
  let disposed = false

  const ready = loading.then((loaded) => {
    if (disposed) {
      loaded.dispose?.()
      return
    }
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
