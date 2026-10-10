import { computed, nextTick } from 'vue'
import { createNode, duplicateNode, findNode, findParent, indentNode, insertNode, moveNodeBy, outdentNode, removeNode } from './tree'

/**
 * @typedef {object} Options
 * @property {() => Kit} kit
 * @property {Ref<WidgetDefinition>} definition
 * @property {(fn: (draft: WidgetDefinition) => void) => void} change
 * @property {Selection} selection
 */

/**
 * Changing the tree around the selection: add, move, nest, duplicate, delete, and edit a node.
 * Every change goes through `change`, so it's undoable.
 *
 * @param {Options} options
 */
export function useTreeEditing({ kit, definition, change, selection }) {
  const { selectedId, isRoot, siblings, position, select, locate } = selection

  const isContainerNode = (node) => !!kit().blocks[node.type]?.container

  const canIndent = computed(() => {
    const above = siblings.value[position.value - 1]
    return !!above && isContainerNode(above)
  })
  const canOutdent = computed(() => {
    if (!selectedId.value) return false
    const parent = findParent(definition.value.root, selectedId.value)
    return !!parent && parent.id !== definition.value.root.id
  })

  /** Adds a block inside the selected container, or after the selection (`where: 'after'`). */
  function add(type, where = 'auto') {
    const target = selectedId.value ?? definition.value.root.id
    const node = createNode(kit(), definition.value, type)
    change((draft) => insertNode(kit(), draft, target, node, where))
    select(node.id)
  }

  /** Reorders the selection among its siblings. */
  function moveBy(delta) {
    const id = selectedId.value
    if (!id || isRoot.value) return
    change((d) => moveNodeBy(d, id, delta))
    void nextTick(locate)
  }

  /** Moves the selection into the container above it. */
  function indent() {
    const id = selectedId.value
    if (!id) return
    change((d) => indentNode(kit(), d, id))
    void nextTick(locate)
  }

  /** Moves the selection out of its container. */
  function outdent() {
    const id = selectedId.value
    if (!id) return
    change((d) => outdentNode(d, id))
    void nextTick(locate)
  }

  function remove() {
    const id = selectedId.value
    if (!id || isRoot.value) return
    const next = siblings.value[position.value + 1] ?? siblings.value[position.value - 1] ?? findParent(definition.value.root, id)
    change((draft) => removeNode(draft, id))
    select(next?.id)
  }

  function duplicate() {
    const id = selectedId.value
    if (!id || isRoot.value) return
    let copy
    change((draft) => (copy = duplicateNode(draft, id)))
    if (copy) select(copy)
  }

  /** Changes the selected node. */
  function editNode(fn) {
    const id = selectedId.value
    if (!id) return
    change((draft) => {
      const node = findNode(draft.root, id)
      if (node) fn(node)
    })
  }

  /** Menu items for adding each of the kit's blocks. */
  const blockOptions = (where) =>
    Object.values(kit().blocks).map((spec) => ({ label: spec.label, icon: spec.icon ?? 'i-lucide-box', onSelect: () => add(spec.type, where) }))

  return { isContainerNode, canIndent, canOutdent, add, moveBy, indent, outdent, remove, duplicate, editNode, blockOptions }
}
