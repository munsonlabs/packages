import { blockDefaults } from '@munsonlabs/loom/editor'

/**
 * Immutable-style helpers over a definition's node tree. Every edit returns a new definition,
 * so the editor can keep snapshots for undo and the model update stays a single assignment.
 */

/** Definitions are JSON by contract, and `structuredClone` rejects the reactive proxies they arrive in. */
export function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function findNode(root, id) {
  if (root.id === id) return root
  for (const child of root.children ?? []) {
    const found = findNode(child, id)
    if (found) return found
  }
  return undefined
}

export function findParent(root, id) {
  for (const child of root.children ?? []) {
    if (child.id === id) return root
    const found = findParent(child, id)
    if (found) return found
  }
  return undefined
}

function allIds(root, ids = new Set()) {
  ids.add(root.id)
  root.children?.forEach((child) => allIds(child, ids))
  return ids
}

export function createNode(kit, definition, type) {
  const ids = allIds(definition.root)
  const base = type.toLowerCase()
  let n = 1
  while (ids.has(`${base}-${n}`)) n++
  const node = { id: `${base}-${n}`, type, props: blockDefaults(kit, type) }
  if (kit.blocks[type]?.container) node.children = []
  return node
}

/** Applies `edit` to a copy of the definition and returns the copy. */
export function update(definition, edit) {
  const draft = clone(definition)
  edit(draft)
  return draft
}

/** Inserts into `targetId` when it's a container (unless `where` is `after`), otherwise after it in its parent. */
export function insertNode(kit, draft, targetId, node, where = 'auto') {
  const target = findNode(draft.root, targetId)
  if (where === 'auto' && target && kit.blocks[target.type]?.container) {
    ;(target.children ??= []).push(node)
    return
  }
  const parent = findParent(draft.root, targetId)
  if (!parent?.children) {
    ;(draft.root.children ??= []).push(node)
    return
  }
  parent.children.splice(parent.children.findIndex((c) => c.id === targetId) + 1, 0, node)
}

export function removeNode(draft, id) {
  const parent = findParent(draft.root, id)
  if (parent?.children) parent.children = parent.children.filter((c) => c.id !== id)
}

/** Moves a node among its siblings by `delta`. */
export function moveNodeBy(draft, id, delta) {
  const siblings = findParent(draft.root, id)?.children
  if (!siblings) return
  const from = siblings.findIndex((c) => c.id === id)
  const to = from + delta
  if (to < 0 || to >= siblings.length) return
  siblings.splice(to, 0, ...siblings.splice(from, 1))
}

/** Moves a node into the sibling above it, when that sibling is a container. */
export function indentNode(kit, draft, id) {
  const parent = findParent(draft.root, id)
  if (!parent?.children) return
  const index = parent.children.findIndex((c) => c.id === id)
  const above = parent.children[index - 1]
  if (!above || !kit.blocks[above.type]?.container) return
  const [node] = parent.children.splice(index, 1)
  ;(above.children ??= []).push(node)
}

/** Moves a node out of its container, to just after it in its grandparent. */
export function outdentNode(draft, id) {
  const parent = findParent(draft.root, id)
  const grandparent = parent && findParent(draft.root, parent.id)
  if (!parent?.children || !grandparent?.children) return
  const [node] = parent.children.splice(
    parent.children.findIndex((c) => c.id === id),
    1,
  )
  grandparent.children.splice(grandparent.children.findIndex((c) => c.id === parent.id) + 1, 0, node)
}

export function duplicateNode(draft, id) {
  const parent = findParent(draft.root, id)
  const node = parent?.children?.find((c) => c.id === id)
  if (!parent?.children || !node) return undefined
  const ids = allIds(draft.root)
  const copy = clone(node)
  const rename = (n) => {
    let i = 2
    while (ids.has(`${n.id}-${i}`)) i++
    n.id = `${n.id}-${i}`
    ids.add(n.id)
    n.children?.forEach(rename)
  }
  rename(copy)
  parent.children.splice(parent.children.indexOf(node) + 1, 0, copy)
  return copy.id
}

/** The ancestors of a node, root first, ending with the node itself. */
export function pathTo(root, id) {
  if (root.id === id) return [root]
  for (const child of root.children ?? []) {
    const path = pathTo(child, id)
    if (path.length) return [root, ...path]
  }
  return []
}
