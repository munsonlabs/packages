import type { IconOverride, IconQuery, IconRequest, IconSource, ResolvedIcon } from '../types/index'
import type { State } from './state'

/**
 * The outcome of deciding who should answer a query, before anyone is actually asked. `override` is
 * already a finished icon when one is pinned under the name; `source` is the one library the query
 * lands on, or `undefined` when there is none to ask.
 */
export interface Plan {
  request: IconRequest
  source: IconSource | undefined
  override: ResolvedIcon | undefined
}

/**
 * Which library a query goes to when it does not name one: the default set with `use()`, else the
 * only registered library if there is exactly one, else none. There is deliberately no scan across
 * several libraries - that made results depend on registration order and turned one miss into a
 * request per library.
 */
function effectiveLibrary(state: State, query: IconQuery): string | undefined {
  if (query.library !== undefined) {
    return query.library
  }
  if (state.defaultLibrary !== null) {
    return state.defaultLibrary
  }
  if (state.libraries.size === 1) {
    return state.libraries.keys().next().value
  }
  return undefined
}

/**
 * Turns a pinned override into the icon a renderer can draw. Overrides are always SVG markup, so the
 * output takes the same shape `svgLibrary` produces and is styled by the same `.icon-svg` rule. A
 * factory override is called here, with the request plus the library the query would otherwise have
 * gone to, so it can vary by variant or by set.
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
 * Works out who answers a query without asking anyone yet. This is the whole of the registry's
 * resolution policy in one place: an override under the exact name wins, otherwise exactly one
 * library is chosen by `effectiveLibrary`. Both `getIconSync` and `getIcon` start here.
 */
export function plan(state: State, name: string, query: IconQuery): Plan {
  const request: IconRequest = { name, variant: query.variant }
  const library = effectiveLibrary(state, query)
  const override = state.overrides.get(name)

  return {
    request,
    source: library === undefined ? undefined : state.libraries.get(library),
    override: override === undefined ? undefined : toOverrideIcon(override, request, library),
  }
}

/**
 * The synchronous answer to a plan, if there is one: the override, else whatever the chosen source
 * can give without I/O (a font class, a cached SVG). `undefined` means "nothing yet", which is
 * different from "nothing at all" - the asynchronous path may still produce an icon.
 */
export function resolveSync({ request, source, override }: Plan): ResolvedIcon | undefined {
  if (override) {
    return override
  }
  return source?.resolveSync?.(request)
}

/**
 * A source's answer, taking the synchronous route when it has one and the asynchronous route
 * otherwise. Callers `await` the result either way, so they never need to know which route was taken.
 */
export function resolveFrom(source: IconSource | undefined, request: IconRequest): ResolvedIcon | undefined | Promise<ResolvedIcon | undefined> {
  const sync = source?.resolveSync?.(request)
  if (sync) {
    return sync
  }
  return source?.resolve?.(request)
}
