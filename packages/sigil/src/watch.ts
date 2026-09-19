import { sigil } from './registry/index'
import type { Sigil } from './registry/index'
import type { IconQuery, ResolvedIcon } from './types/index'

/**
 * Resolves an icon and keeps it current: synchronously when it can, asynchronously otherwise, and again
 * whenever the registry changes. A result that arrives after a newer resolution started, or after
 * `stop()`, is dropped, so the last resolution always wins whatever order the network answers in. On a
 * synchronous miss nothing is reported until the asynchronous answer lands, so whatever is already
 * rendered stays put instead of flashing empty.
 *
 * This is what `<ml-sigil>` and the Vue `<Sigil>` are built on, and what any other host should build on
 * too: `onIcon` receives either an icon to draw or `undefined` to draw nothing, and the returned function
 * stops everything when the host goes away. Pass a registry to watch one made with `createSigil()`
 * instead of the shared one.
 */
export function watchIcon(name: string, query: IconQuery, onIcon: (icon: ResolvedIcon | undefined) => void, registry: Sigil = sigil): () => void {
  let latest = 0

  function run(): void {
    const ticket = ++latest

    const sync = registry.getIconSync(name, query)
    if (sync) {
      onIcon(sync)
      return
    }

    void registry.getIcon(name, query).then((icon) => {
      if (ticket === latest) {
        onIcon(icon)
      }
    })
  }

  const unsubscribe = registry.subscribe(run)
  run()

  return () => {
    latest++
    unsubscribe()
  }
}
