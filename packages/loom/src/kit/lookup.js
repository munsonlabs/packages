import { DEFINITION_VERSION } from '../types'

/** Finding things in a kit: a kind, a block's defaults, and the widget for some data. */

/**
 * @param {Kit} kit
 * @param {string | undefined} id
 * @returns {Kind | undefined}
 */
export function getKind(kit, id) {
  return id ? kit.kinds.find((k) => k.id === id) : undefined
}

/**
 * The first kind whose `matches` accepts the data.
 *
 * @template TData
 * @param {Kit<TData>} kit
 * @param {TData} data
 * @returns {Kind<TData> | undefined}
 */
export function matchKind(kit, data) {
  return kit.kinds.find((k) => k.matches(data))
}

/**
 * The definition to render some data with: the first whose kind matches it.
 *
 * @template TData
 * @param {Kit<TData>} kit
 * @param {TData} data
 * @param {WidgetDefinition[]} definitions
 * @returns {WidgetDefinition | undefined}
 */
export function matchDefinition(kit, data, definitions) {
  return definitions.find((d) => {
    const kind = getKind(kit, d.kind)
    return !!kind && kind.matches(data)
  })
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
 * @param {Kit} kit
 * @param {string} type
 * @returns {Record<string, unknown>}
 */
export function blockDefaults(kit, type) {
  return Object.fromEntries(Object.entries(kit.blocks[type]?.props ?? {}).map(([name, spec]) => [name, spec.default]))
}
