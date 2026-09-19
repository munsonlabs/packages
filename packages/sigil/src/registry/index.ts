import type { IconOverride, IconQuery, LibraryConfig, ResolvedIcon } from '../types/index'
import { version } from '../../package.json'
import { createLazySource } from './lazy'
import { isSource, loadKind } from './load'
import { plan, resolveFrom, resolveSync } from './lookup'
import { createState, notify } from './state'

/**
 * A registry: named libraries, pinned overrides, a default library and a list of subscribers. This is
 * the type of the shared `sigil` and of anything `createSigil()` returns. Every member is a closure
 * over private state rather than a method, so `const { register } = sigil` works without binding.
 */
export interface Sigil {
  readonly version: string
  readonly defaultLibrary: string | null
  readonly libraries: string[]
  register(name: string, config: LibraryConfig, options?: { default?: boolean }): Promise<void>
  unregister(name: string): void
  use(name: string | null): void
  override(name: string, icon: IconOverride | null): void
  override(icons: Record<string, IconOverride | null>): void
  getIconSync(name: string, query?: IconQuery): ResolvedIcon | undefined
  getIcon(name: string, query?: IconQuery): Promise<ResolvedIcon | undefined>
  subscribe(listener: () => void): () => void
  clear(): void
}

/**
 * Builds a registry that shares nothing with any other. The page-wide `sigil` below is one of these;
 * call this directly when isolation is the point - a widget that must not be affected by the host
 * page's icons, or a per-request registry on a server, where the shared instance is process-wide.
 */
export function createSigil(): Sigil {
  const state = createState()

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
     * Adds a library under a name, replacing (and disposing) any library already there. A ready source
     * is live at once. A description gets a placeholder immediately and the real source when its kind's
     * module has loaded, so the name is listed and mounted icons re-render without anyone waiting; the
     * returned promise settles when the library is actually able to answer. If that load fails and this
     * library had been made the default, the default is cleared so lookups do not keep landing on it.
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
     * Removes a library and lets it release whatever it holds. If it was the default, there is no
     * default afterwards rather than a dangling name.
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
     * Sets the library that answers when a lookup names none, or clears it with `null`. This is the
     * runtime switch: every mounted icon without a `library` attribute follows it.
     */
    use(name) {
      state.defaultLibrary = name
      changed()
    },

    /**
     * Pins markup (or a factory producing markup) to a name, ahead of every library, one name at a time
     * or several from a record. `null` unpins. An override is how a single icon is replaced without
     * touching the set it came from.
     */
    override(nameOrIcons: string | Record<string, IconOverride | null>, icon?: IconOverride | null) {
      const entries = typeof nameOrIcons === 'string' ? [[nameOrIcons, icon ?? null] as const] : Object.entries(nameOrIcons)
      for (const [name, value] of entries) {
        if (value === null) {
          state.overrides.delete(name)
        } else {
          state.overrides.set(name, value)
        }
      }
      changed()
    },

    /**
     * The answer available right now, without I/O: an override, or what the chosen library can give
     * synchronously. Renderers call this first so a font class or a cached SVG paints in the same frame.
     */
    getIconSync(name, query = {}) {
      return resolveSync(plan(state, name, query))
    },

    /**
     * The full answer: the synchronous one if there is one, otherwise whatever the chosen library
     * resolves asynchronously. A source that throws yields `undefined` - the icon simply does not render -
     * with a warning in development builds so the cause is not silent.
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
     * Registers a listener for every change - registration, override, removal, default - and returns
     * the function that removes it. `watchIcon` is built on this.
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
      state.libraries.clear()
      state.defaultLibrary = null
      changed()
    },
  }
}

/**
 * The page-wide registry. It is parked on `globalThis` under a well-known symbol so that, however many
 * copies of this package end up on one page (the app's bundle, a third-party component's bundle, a
 * publisher's script from a CDN), the first to load creates the instance and every later one finds and
 * reuses it. That sharing is what lets a separately loaded script replace icons the app already renders.
 * On a server the same mechanism makes the instance process-wide - use `createSigil()` for anything
 * per request.
 */
const KEY = Symbol.for('@munsonlabs/sigil')
const shared = globalThis as { [KEY]?: Sigil }

export const sigil: Sigil = (shared[KEY] ??= createSigil())

/**
 * The shared registry's members as named exports, so `import { register } from '@munsonlabs/sigil'` is
 * all most code needs. They are closures, not methods, so nothing has to be bound.
 */
export const { register, unregister, override, use, getIcon, getIconSync, subscribe, clear } = sigil
