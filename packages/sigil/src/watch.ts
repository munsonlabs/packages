import { sigil } from './registry/index'
import type { Sigil } from './registry/index'
import type { IconQuery, ResolvedIcon } from './types/index'

/**
 * Resolves an icon and keeps it current whenever the registry changes. The last resolution always wins
 * whatever order the network answers in.
 */
export function watchIcon(name: string, query: IconQuery, onIcon: (icon: ResolvedIcon | undefined) => void, registry: Sigil = sigil): () => void {
  let latest = 0
  const unsubscribe = registry.subscribe(() => void run())

  async function run(): Promise<void> {
    const ticket = ++latest

    const sync = registry.getIconSync(name, query)
    if (sync) return onIcon(sync)

    const icon = await registry.getIcon(name, query)
    if (ticket === latest) onIcon(icon)
  }

  void run()

  return () => {
    latest++
    unsubscribe()
  }
}
