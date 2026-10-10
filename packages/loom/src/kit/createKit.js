import { builtinBlocks } from '../blocks/builtin'

/** Identity helpers: they return what they're given, and say what each object is where it's written. */
export const defineSource = (source) => source
export const defineBlock = (block) => block

function describeDefault(data) {
  if (data && typeof data === 'object') {
    for (const key of ['label', 'title', 'name', 'id']) if (typeof data[key] === 'string') return data[key]
  }
  return String(data)
}

/**
 * A kit is everything your app lets widgets use: its data and actions, and its blocks.
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
  for (const block of options.blocks ?? []) {
    if (block.type in builtinBlocks) throw new Error(`[loom] "${block.type}" is a built-in block`)
    if (!block.component) throw new Error(`[loom] block "${block.type}" needs a component`)
    blocks[block.type] = block
  }

  return { sources, blocks, describe: options.describe ?? describeDefault }
}
