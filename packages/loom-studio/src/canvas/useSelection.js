import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { findNode, findParent, pathTo } from '../editing/tree'

/**
 * @typedef {object} Options
 * @property {Ref<WidgetDefinition>} definition
 * @property {Ref<{ root: WidgetNode; hidden: Set<string> }>} tree The tree as the edited variant arranges it, hidden nodes listed.
 * @property {Ref<HTMLElement | undefined>} stage The canvas element the widget renders in.
 */

/**
 * What's selected on the canvas: the node, its place in the tree, and the element its editing
 * popover anchors to. Loom renders every node with a `data-node-id`, which is how a node is
 * found on screen.
 *
 * @param {Options} options
 */
export function useSelection({ definition, tree, stage }) {
  const selectedId = ref()
  const selected = computed(() => (selectedId.value ? findNode(tree.value.root, selectedId.value) : undefined))
  /** The path from the root to the selection, for the breadcrumb. */
  const crumbs = computed(() => (selectedId.value ? pathTo(tree.value.root, selectedId.value) : []))
  const isRoot = computed(() => selectedId.value === definition.value.root.id)
  const siblings = computed(() => (selectedId.value ? (findParent(tree.value.root, selectedId.value)?.children ?? []) : []))
  const position = computed(() => siblings.value.findIndex((c) => c.id === selectedId.value))
  const isHidden = computed(() => !!selectedId.value && tree.value.hidden.has(selectedId.value))

  /** The element the popover is anchored to. */
  const selectedEl = shallowRef()
  const popoverOpen = ref(false)
  /** False when the selected node isn't rendered and the popover anchors to its nearest rendered ancestor. */
  const anchoredToSelf = ref(true)

  const elementFor = (id) => stage.value?.querySelector(`[data-node-id="${CSS.escape(id)}"]`) ?? undefined

  /**
   * Finds what the popover anchors to: the node's own element, or, for a node that isn't rendered
   * (hidden in this variant, or its `Show when` is false for this data), its nearest rendered
   * ancestor's, so it can still be edited and brought back.
   */
  function locate() {
    const id = selectedId.value
    const own = id ? elementFor(id) : undefined
    anchoredToSelf.value = !!own
    selectedEl.value =
      own ??
      crumbs.value
        .slice(0, -1)
        .reverse()
        .map((crumb) => elementFor(crumb.id))
        .find(Boolean)
    if (!selectedEl.value) popoverOpen.value = false
  }

  /** Why the selected node isn't on screen, when it isn't. */
  const offscreen = computed(() => {
    if (anchoredToSelf.value || !selectedId.value) return undefined
    const hiddenBy = crumbs.value.find((crumb) => tree.value.hidden.has(crumb.id))
    if (hiddenBy) return { kind: 'hidden', id: hiddenBy.id, self: hiddenBy.id === selectedId.value }
    return { kind: 'unrendered' }
  })

  /** Selects a node (or nothing), and opens its popover once the canvas has rendered. */
  function select(id, open = true) {
    selectedId.value = id
    popoverOpen.value = false
    void nextTick(() => {
      locate()
      if (selectedEl.value && open) popoverOpen.value = true
    })
  }

  // The selected node was deleted: select nothing.
  watch(selected, (node) => {
    if (selectedId.value && !node) select(undefined)
  })

  return {
    selectedId,
    selected,
    crumbs,
    isRoot,
    siblings,
    position,
    isHidden,
    selectedEl,
    popoverOpen,
    anchoredToSelf,
    offscreen,
    elementFor,
    locate,
    select,
  }
}

/** @typedef {ReturnType<typeof useSelection>} Selection */
