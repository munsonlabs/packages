import type { IconOverride, IconQuery, LibraryConfig, OverrideOptions, ResolvedIcon } from '../types/index'
import { version } from '../../package.json'
import { createLazySource } from './lazy'
import { isSource, loadKind } from './load'
import { plan, resolveFrom, resolveSync } from './lookup'
import { createState, notify } from './state'

/**
 * A registry: named libraries, pinned overrides, a default library and a list of subscribers. The
 * type of the shared `sigil` and of anything `createSigil()` returns.
 */
export interface Sigil {
  readonly version: string
  readonly defaultLibrary: string | null
  readonly libraries: string[]
  register(name: string, config: LibraryConfig, options?: { default?: boolean }): Promise<void>
  unregister(name: string): void
  use(name: string | null): void
  override(name: string, icon: IconOverride | null, options?: OverrideOptions): void
  override(icons: Record<string, IconOverride | null>, options?: OverrideOptions): void
  getIconSync(name: string, query?: IconQuery): ResolvedIcon | undefined
  getIcon(name: string, query?: IconQuery): Promise<ResolvedIcon | undefined>
  subscribe(listener: () => void): () => void
  clear(): void
}

/**
 * Builds a registry that shares nothing with any other - use it for an isolated widget, or a
 * per-request registry on a server.
 */
export function createSigil(): Sigil {
  const state = createState()

  /**
   * The per-library override map for a library name, creating an empty one on first use.
   */
  function mapFor(byLibrary: Map<string, Map<string, IconOverride>>, library: string): Map<string, IconOverride> {
    let map = byLibrary.get(library)
    if (map === undefined) {
      map = new Map()
      byLibrary.set(library, map)
    }
    return map
  }

  function changed(): void {
    notify(state)
  }

  return {
    version,

    get defaultLibrary() {
      return state.defaultLibrary
    },

    get libraries() {
      return [...state.libraries.keys()]
    },

    /**
     * Adds a library under a name, replacing (and disposing) any library already there. Returns a
     * promise that settles once the library is actually able to answer.
     */
    register(name, config, options = {}) {
      state.libraries.get(name)?.dispose?.()
      if (options.default) {
        state.defaultLibrary = name
      }

      if (isSource(config)) {
        state.libraries.set(name, config)
        changed()
        return Promise.resolve()
      }

      const [placeholder, ready] = createLazySource(loadKind(name, config), (loaded) => {
        if (state.libraries.get(name) !== placeholder) {
          return
        }
        state.libraries.set(name, loaded)
        changed()
      })
      state.libraries.set(name, placeholder)
      changed()

      return ready.catch((error: unknown) => {
        if (state.defaultLibrary === name) {
          state.defaultLibrary = null
          changed()
        }
        throw error
      })
    },

    /**
     * Removes a library and lets it release whatever it holds. Clears the default if it was set
     * to this library.
     */
    unregister(name) {
      state.libraries.get(name)?.dispose?.()
      state.libraries.delete(name)
      if (state.defaultLibrary === name) {
        state.defaultLibrary = null
      }
      changed()
    },

    /**
     * Sets the library that answers when a lookup names none, or clears it with `null`.
     */
    use(name) {
      state.defaultLibrary = name
      changed()
    },

    /**
     * Pins markup (or a factory producing markup) to a name, ahead of every library, one name at a
     * time or several from a record. `null` unpins. `{ library }` scopes the pin to one library's
     * names instead of answering for every library.
     */
    override(
      nameOrIcons: string | Record<string, IconOverride | null>,
      iconOrOptions?: IconOverride | null | OverrideOptions,
      maybeOptions?: OverrideOptions,
    ) {
      let entries: Array<readonly [string, IconOverride | null]>
      let options: OverrideOptions | undefined

      if (typeof nameOrIcons === 'string') {
        entries = [[nameOrIcons, (iconOrOptions ?? null) as IconOverride | null]]
        options = maybeOptions
      } else {
        entries = Object.entries(nameOrIcons)
        options = iconOrOptions as OverrideOptions | undefined
      }

      const target = options?.library === undefined ? state.overrides : mapFor(state.libraryOverrides, options.library)
      for (const [name, value] of entries) {
        if (value === null) {
          target.delete(name)
        } else {
          target.set(name, value)
        }
      }
      changed()
    },

    /**
     * The answer available right now, without I/O: an override, or what the chosen library can
     * give synchronously.
     */
    getIconSync(name, query = {}) {
      return resolveSync(plan(state, name, query))
    },

    /**
     * The full answer: the synchronous one if there is one, otherwise whatever the chosen library
     * resolves asynchronously. A source that throws yields `undefined`.
     */
    async getIcon(name, query = {}) {
      const { request, source, override } = plan(state, name, query)
      if (override) {
        return override
      }

      try {
        return await resolveFrom(source, request)
      } catch (error) {
        // Optional chain: the library build leaves import.meta.env in place, and it is undefined on a plain <script type="module">.
        if (import.meta.env?.DEV) {
          console.warn(`[sigil] "${name}" failed to resolve`, error)
        }
        return undefined
      }
    },

    /**
     * Registers a listener for every change. Returns the function that removes it.
     */
    subscribe(listener) {
      state.listeners.add(listener)
      return () => {
        state.listeners.delete(listener)
      }
    },

    /**
     * Back to empty: every library disposed and forgotten, every override dropped, no default.
     */
    clear() {
      for (const source of state.libraries.values()) {
        source.dispose?.()
      }
      state.overrides.clear()
      state.libraryOverrides.clear()
      state.libraries.clear()
      state.defaultLibrary = null
      changed()
    },
  }
}

/**
 * The page-wide registry, shared by every copy of this package on the page via a well-known
 * `globalThis` symbol. Use `createSigil()` instead for a per-request instance on a server.
 */
const KEY = Symbol.for('@munsonlabs/sigil')
const shared = globalThis as { [KEY]?: Sigil }

export const sigil: Sigil = (shared[KEY] ??= createSigil())

/**
 * The shared registry's members as named exports, so `import { register } from '@munsonlabs/sigil'`
 * is all most code needs.
 */
export const { register, unregister, override, use, getIcon, getIconSync, subscribe, clear } = sigil
