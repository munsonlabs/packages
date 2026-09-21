import { sigil } from './registry/index'
import type { Sigil } from './registry/index'
import type { LibraryConfig } from './types/index'

/**
 * Keeps a library registered: registers it now if it's missing, and again whenever the registry
 * changes and it's missing. Returns the function that stops watching.
 */
export function keepLibrary(name: string, config: LibraryConfig, registry: Sigil = sigil): () => void {
  function ensure(): void {
    if (!registry.libraries.includes(name)) {
      void registry.register(name, config)
    }
  }
  ensure()
  return registry.subscribe(ensure)
}
