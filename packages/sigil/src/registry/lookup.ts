import type { IconOverride, IconQuery, IconRequest, IconSource, ResolvedIcon } from '../types/index'
import type { State } from './state'

/**
 * The outcome of deciding who should answer a query, before anyone is actually asked.
 */
export interface Plan {
  request: IconRequest
  source: IconSource | undefined
  override: ResolvedIcon | undefined
}

/**
 * Which library a query goes to when it does not name one: the default set with `use()`, else the
 * only registered library if there is exactly one, else none.
 */
function effectiveLibrary(state: State, query: IconQuery): string | undefined {
  if (query.library !== undefined) return query.library
  if (state.defaultLibrary !== null) return state.defaultLibrary
  if (state.libraries.size === 1) return state.libraries.keys().next().value
  return undefined
}

/**
 * Turns a pinned override into the icon a renderer can draw. A factory override is called with the
 * request plus the library the query would otherwise have gone to.
 */
export function toOverrideIcon(override: IconOverride, request: IconRequest, library: string | undefined): ResolvedIcon {
  const html = typeof override === 'function' ? override({ ...request, library }) : override
  return {
    tag: 'span',
    className: 'icon-svg',
    html,
  }
}

/**
 * The override pinned to a name, if any - a library-scoped one first, else a global one.
 */
function overrideFor(state: State, name: string, library: string | undefined): IconOverride | undefined {
  if (library !== undefined) {
    const scoped = state.libraryOverrides.get(library)?.get(name)
    if (scoped !== undefined) return scoped
  }
  return state.overrides.get(name)
}

/**
 * Works out who answers a query without asking anyone yet: an override if one is pinned,
 * otherwise the library `effectiveLibrary` picks.
 */
export function plan(state: State, name: string, query: IconQuery): Plan {
  const request: IconRequest = { name, variant: query.variant }
  const library = effectiveLibrary(state, query)
  const override = overrideFor(state, name, library)

  return {
    request,
    source: library === undefined ? undefined : state.libraries.get(library),
    override: override === undefined ? undefined : toOverrideIcon(override, request, library),
  }
}

/**
 * The synchronous answer to a plan, if there is one: the override, else whatever the chosen
 * source can give without I/O.
 */
export function resolveSync({ request, source, override }: Plan): ResolvedIcon | undefined {
  if (override) return override
  return source?.resolveSync?.(request)
}

/**
 * A source's answer, taking the synchronous route when it has one and the asynchronous route
 * otherwise.
 */
export function resolveFrom(source: IconSource | undefined, request: IconRequest): ResolvedIcon | undefined | Promise<ResolvedIcon | undefined> {
  const sync = source?.resolveSync?.(request)
  if (sync) return sync
  return source?.resolve?.(request)
}
