import { builtinBlocks } from '../blocks/builtin'

/**
 * A kit is everything your app lets widgets use: its data and actions.
 * Kits are independent, so two apps or two presets can share a page.
 *
 * @template [TData=any]
 * @template [TContext=any]
 * @param {KitOptions<TData, TContext>} [options={}]
 * @returns {Kit<TData, TContext>}
 */
export function createKit(options = {}) {
  const sources = {}
  for (const source of options.sources ?? []) {
    if (source.id === 'item' || source.id === 'repeat') throw new Error(`[loom] "${source.id}" is reserved for the current Repeat item`)
    if (sources[source.id]) throw new Error(`[loom] two sources share the id "${source.id}"`)
    sources[source.id] = source
  }

  const blocks = { ...builtinBlocks }

  return { sources, blocks }
}
