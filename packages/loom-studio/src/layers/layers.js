import { iconFor } from '../panels/options'

/**
 * One row in the layers panel.
 *
 * @typedef {object} LayerRow
 * @property {string} id
 * @property {string} label
 * @property {string} icon
 * @property {string} [hint] What it shows, at a glance: a bound value (`story.title`) or its text.
 * @property {number} depth
 * @property {boolean} hasChildren
 * @property {boolean} isContainer
 * @property {boolean} hidden Hidden in the variant being edited.
 * @property {boolean} insideHidden Inside something hidden in the variant being edited.
 */

const hintFor = (node) => {
  const bound = node.bind?.text ?? node.bind?.label ?? node.bind?.src ?? Object.values(node.bind ?? {})[0]
  if (bound) return bound
  const text = node.props?.text ?? node.props?.label
  return typeof text === 'string' && text ? `“${text}”` : undefined
}

/** The tree as rows, depth first, skipping the children of collapsed nodes. */
export function layerRows(kit, tree, collapsed) {
  const rows = []
  const walk = (node, depth, insideHidden) => {
    const hidden = tree.hidden.has(node.id)
    rows.push({
      id: node.id,
      label: kit.blocks[node.type]?.label ?? node.type,
      icon: iconFor(kit, node.type),
      hint: hintFor(node),
      depth,
      hasChildren: !!node.children?.length,
      isContainer: !!kit.blocks[node.type]?.container,
      hidden,
      insideHidden,
    })
    if (!collapsed.has(node.id)) node.children?.forEach((child) => walk(child, depth + 1, insideHidden || hidden))
  }
  walk(tree.root, 0, false)
  return rows
}

/**
 * Where a drop lands on a row, from where the pointer sits in it: the top or bottom quarter of a
 * container means before or after it, the middle means inside; any other row splits in half.
 */
export function dropPosition(y, row, isContainer) {
  const t = (y - row.top) / row.height
  if (isContainer) return t < 0.25 ? 'before' : t > 0.75 ? 'after' : 'inside'
  return t < 0.5 ? 'before' : 'after'
}
