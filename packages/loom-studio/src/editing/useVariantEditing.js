import { computed, ref, watch } from 'vue'
import { applyVariant, BASE_VARIANT, findVariant, variantTree } from '@munsonlabs/loom/editor'
import { clone } from './tree'

/** Sets or clears one node's override in a variant, dropping the variant's `overrides` when it's empty. */
export function setOverride(variant, nodeId, override) {
  const overrides = { ...variant.overrides }
  if (override && Object.keys(override).length) overrides[nodeId] = override
  else delete overrides[nodeId]
  variant.overrides = Object.keys(overrides).length ? overrides : undefined
}

/**
 * Which variant is being edited, and the tree as it arranges it. Editing a variant never touches
 * the base: changes become that variant's overrides, moves become a parent's `order`, and
 * delete hides.
 */
export function useVariantEditing(definition, change) {
  const variantId = ref(BASE_VARIANT)
  const variant = computed(() => findVariant(definition.value, variantId.value))
  // The variant was deleted or renamed: go back to the base.
  watch(variant, (v) => {
    if (!v) variantId.value = BASE_VARIANT
  })

  /** The tree as the edited variant arranges it, hidden nodes kept (and listed). */
  const tree = computed(() => variantTree(definition.value, variantId.value, true))
  /** What the edited variant renders: what bindings are offered against. */
  const rendered = computed(() => applyVariant(definition.value, variantId.value))

  const variantOptions = computed(() => [
    { label: 'Base', value: BASE_VARIANT, icon: 'i-lucide-square-dashed' },
    ...(definition.value.variants ?? []).map((v) => ({ label: v.label, value: v.id, icon: 'i-lucide-git-branch' })),
  ])
  const variantLabel = (id) => (!id || id === BASE_VARIANT ? 'Base' : (definition.value.variants?.find((v) => v.id === id)?.label ?? id))

  /** Changes the edited variant, as one undoable edit. */
  function editVariant(fn) {
    const id = variantId.value
    change((draft) => {
      const v = draft.variants?.find((x) => x.id === id)
      if (v) fn(v)
    })
  }

  /** Hides a node in the edited variant, or shows it again. The root can't be hidden. */
  function toggleHidden(nodeId) {
    if (nodeId === definition.value.root.id) return
    editVariant((v) => {
      const next = { ...v.overrides?.[nodeId] }
      if (next.hidden) delete next.hidden
      else next.hidden = true
      setOverride(v, nodeId, next)
    })
  }

  /** Drops one field's override on a node, so it reads the base's value again. */
  function resetField(nodeId, field) {
    editVariant((v) => {
      const o = clone(v.overrides?.[nodeId])
      if (!o) return
      if (field.field === 'prop') {
        delete o.props?.[field.name]
        delete o.bind?.[field.name]
      } else if (field.field === 'event') delete o.on?.[field.name]
      else if (field.field === 'if') delete o.if
      else delete o.style
      for (const key of ['props', 'bind', 'on']) if (o[key] && !Object.keys(o[key]).length) delete o[key]
      setOverride(v, nodeId, o)
    })
  }

  return { variantId, variant, tree, rendered, variantOptions, variantLabel, editVariant, toggleHidden, resetField }
}

/** @typedef {ReturnType<typeof useVariantEditing>} VariantEditing */
