import { computed, nextTick } from 'vue'
import { diffAsOverride } from '@munsonlabs/loom/editor'
import { clone, createNode, duplicateNode, findNode, findParent, indentNode, insertNode, moveNodeBy, outdentNode, removeNode } from './tree'
import { setOverride } from './useVariantEditing'

/**
 * @typedef {object} Options
 * @property {() => Kit} kit
 * @property {Ref<WidgetDefinition>} definition
 * @property {(fn: (draft: WidgetDefinition) => void) => void} change
 * @property {VariantEditing} variants
 * @property {Selection} selection
 */

/**
 * Changing the tree around the selection: add, move, nest, duplicate, delete, and edit a node.
 * On the base anything goes. In a variant, structure is the base's: moves become the parent's
 * `order`, delete hides, and adding or nesting isn't offered.
 *
 * @param {Options} options
 */
export function useTreeEditing({ kit, definition, change, variants, selection }) {
  const { variant, tree, editVariant, toggleHidden } = variants
  const { selectedId, selected, isRoot, siblings, position, select, locate } = selection

  const isContainerNode = (node) => !!kit().blocks[node.type]?.container

  const canIndent = computed(() => {
    const above = siblings.value[position.value - 1]
    return !variant.value && !!above && isContainerNode(above)
  })
  const canOutdent = computed(() => {
    if (variant.value || !selectedId.value) return false
    const parent = findParent(tree.value.root, selectedId.value)
    return !!parent && parent.id !== definition.value.root.id
  })

  /** Adds a block inside the selected container, or after the selection (`where: 'after'`). */
  function add(type, where = 'auto') {
    if (variant.value) return
    const target = selectedId.value ?? definition.value.root.id
    const node = createNode(kit(), definition.value, type)
    change((draft) => insertNode(kit(), draft, target, node, where))
    select(node.id)
  }

  /** Reorders the selection among its siblings. */
  function moveBy(delta) {
    const id = selectedId.value
    if (!id || isRoot.value) return
    if (!variant.value) {
      change((d) => moveNodeBy(d, id, delta))
    } else {
      const parent = findParent(tree.value.root, id)
      if (!parent?.children) return
      const order = parent.children.map((c) => c.id)
      const from = order.indexOf(id)
      if (from + delta < 0 || from + delta >= order.length) return
      order.splice(from + delta, 0, ...order.splice(from, 1))
      editVariant((v) => setOverride(v, parent.id, { ...v.overrides?.[parent.id], order }))
    }
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
    // Structure belongs to the base; in a variant, delete means hide.
    if (variant.value) return toggleHidden(id)
    const next = siblings.value[position.value + 1] ?? siblings.value[position.value - 1] ?? findParent(tree.value.root, id)
    change((draft) => removeNode(draft, id))
    select(next?.id)
  }

  function duplicate() {
    const id = selectedId.value
    if (!id || isRoot.value || variant.value) return
    let copy
    change((draft) => (copy = duplicateNode(draft, id)))
    if (copy) select(copy)
  }

  /** Changes the selected node: directly on the base, or as the smallest override in a variant. */
  function editNode(fn) {
    const id = selectedId.value
    if (!id) return
    if (variant.value) {
      const base = findNode(definition.value.root, id)
      const current = selected.value
      if (!base || !current) return
      const edited = clone(current)
      fn(edited)
      editVariant((v) => setOverride(v, id, diffAsOverride(base, edited, v.overrides?.[id])))
    } else {
      change((draft) => {
        const node = findNode(draft.root, id)
        if (node) fn(node)
      })
    }
  }

  /** Menu items for adding each of the kit's blocks. */
  const blockOptions = (where) =>
    Object.values(kit().blocks).map((spec) => ({ label: spec.label, icon: spec.icon ?? 'i-lucide-box', onSelect: () => add(spec.type, where) }))

  return { isContainerNode, canIndent, canOutdent, add, moveBy, indent, outdent, remove, duplicate, editNode, blockOptions }
}
