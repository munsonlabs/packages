import { bindableValues } from '@munsonlabs/loom/editor'

/**
 * @typedef {object} SelectOption
 * @property {'label'} [type]
 * @property {string} label
 * @property {string} [value]
 * @property {string} [description]
 */

/** Bindable values for a node, filtered and grouped by source for a grouped `USelect`. */
export function valueOptions(kit, definition, nodeId, accept) {
  const groups = new Map()
  for (const option of bindableValues(kit, definition, nodeId).filter(accept)) {
    if (!groups.has(option.source)) groups.set(option.source, [{ type: 'label', label: option.sourceLabel }])
    groups.get(option.source).push({ label: option.label, value: option.path, description: option.description })
  }
  return [...groups.values()]
}

export const typeColor = {
  string: 'neutral',
  number: 'neutral',
  boolean: 'success',
  list: 'info',
  object: 'info',
  action: 'warning',
}

/** A block's icon; unknown types get a generic box. */
export function iconFor(kit, type) {
  return kit.blocks[type]?.icon ?? 'i-lucide-box'
}

/**
 * A field of a node a variant can override, for resetting it to the base.
 *
 * @typedef {(
 *     | { field: 'prop'; name: string }
 *     | { field: 'event'; name: string }
 *     | { field: 'if' }
 *     | { field: 'style' }
 * )} OverrideField
 */
