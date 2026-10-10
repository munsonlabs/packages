import { builtinBlocks } from '../blocks/builtin'

/**
 * Identity helper: it returns what it's given, and says what the object is where it's written.
 *
 * @template [TData=any]
 * @template [TContext=any]
 * @param {Source<TData, TContext>} source
 */
export const defineSource = (source) => source

/**
 * A kit is everything your app lets widgets use: its data.
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
    if (sources[source.id]) throw new Error(`[loom] two sources share the id "${source.id}"`)
    sources[source.id] = source
  }

  const blocks = { ...builtinBlocks }

  return { sources, blocks }
}
