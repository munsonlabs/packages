import { DEFINITION_VERSION } from '../types'
import { kindDepth } from './kinds'

/** Finding things in a kit: a kind, a theme, a block's defaults, and the widget for some data. */

/**
 * @param {Kit} kit
 * @param {string | undefined} id
 * @returns {Kind | undefined}
 */
export function getKind(kit, id) {
  return id ? kit.kinds.find((k) => k.id === id) : undefined
}

/**
 * The kind for some data: the most specific one that matches it, the first of those if several
 * are as specific.
 *
 * @template TData
 * @param {Kit<TData>} kit
 * @param {TData} data
 * @returns {Kind<TData> | undefined}
 */
export function matchKind(kit, data) {
  return mostSpecific(kit, kit.kinds, (k) => k, data)
}

/**
 * The definition to render some data with: the one whose kind matches it most specifically,
 * so a widget for breaking articles beats one for articles wherever each sits. Among equally
 * specific ones, the first.
 *
 * @template TData
 * @param {Kit<TData>} kit
 * @param {TData} data
 * @param {WidgetDefinition[]} definitions
 * @returns {WidgetDefinition | undefined}
 */
export function matchDefinition(kit, data, definitions) {
  return mostSpecific(kit, definitions, (d) => getKind(kit, d.kind), data)
}

function mostSpecific(kit, items, kindOf, data) {
  let best
  let bestDepth = -1
  for (const item of items) {
    const kind = kindOf(item)
    if (!kind?.matches(data)) continue
    const depth = kindDepth(kit, kind)
    if (depth > bestDepth) [best, bestDepth] = [item, depth]
  }
  return best
}

/**
 * A new definition of a kind, from its starter.
 *
 * @param {Kit} kit
 * @param {string} kindId
 * @param {{ id: string; name: string }} identity
 * @returns {WidgetDefinition}
 */
export function createDefinition(kit, kindId, identity) {
  const kind = getKind(kit, kindId)
  if (!kind) throw new Error(`[loom] unknown kind "${kindId}"`)
  return { version: DEFINITION_VERSION, ...structuredClone(kind.starter()), ...identity, kind: kind.id }
}

/**
 * A kit's theme by id, or its default (first) theme.
 *
 * @param {Kit} kit
 * @param {string} [id]
 * @returns {Theme}
 */
export function getTheme(kit, id) {
  return (id && kit.themes.find((t) => t.id === id)) || kit.themes[0]
}

/**
 * @param {Kit} kit
 * @param {string} type
 * @returns {Record<string, unknown>}
 */
export function blockDefaults(kit, type) {
  return Object.fromEntries(Object.entries(kit.blocks[type]?.props ?? {}).map(([name, spec]) => [name, spec.default]))
}
