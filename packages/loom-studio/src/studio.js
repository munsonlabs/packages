import { computed, inject, nextTick, provide, reactive, ref, watch } from 'vue'
import { hasErrors, validateDefinition } from '@munsonlabs/loom'
import { useSelection } from './canvas/useSelection'
import { useHistory } from './editing/useHistory'
import { useTreeEditing } from './editing/useTreeEditing'
import { useVariantEditing } from './editing/useVariantEditing'
import { usePreview } from './preview/usePreview'

/**
 * What `<LoomStudio>` takes, as the studio reads it.
 *
 * @typedef {object} StudioProps
 * @property {Kit} kit
 * @property {unknown[]} samples
 * @property {unknown} [context]
 */

/**
 * @typedef {object} StudioEvents
 * @property {(definition: WidgetDefinition) => void} publish
 */

/**
 * Everything the studio's parts share, built once by `<LoomStudio>` and provided to the
 * components inside it. Each concern lives in its own composable; this only wires them together.
 *
 * @param {Ref<WidgetDefinition>} definition
 * @param {StudioProps} props
 * @param {StudioEvents} events
 */
export function createStudio(definition, props, events) {
  const kit = () => props.kit

  const stage = ref()

  /** Which popovers and dialogs are open. */
  const open = reactive({ variants: false, theme: false, issues: false, export: false, import: false })

  const history = useHistory(definition)
  const variants = useVariantEditing(definition, history.change)
  const selection = useSelection({ definition, tree: variants.tree, stage })
  const editing = useTreeEditing({ kit, definition, change: history.change, variants, selection })
  const preview = usePreview({ kit, samples: () => props.samples, definition })

  // Keep the popover anchored to the element as edits re-render it.
  watch([variants.rendered, variants.variantId], () => void nextTick(selection.locate), { flush: 'post' })

  /** A click on the canvas selects what was clicked. */
  function onStageClick(e) {
    e.preventDefault()
    e.stopPropagation()
    selection.select(e.target.closest('[data-node-id]')?.dataset.nodeId)
  }

  // --- Validation
  const issues = computed(() => validateDefinition(props.kit, definition.value))
  /** Errors stop publishing. */
  const errors = computed(() => hasErrors(issues.value))
  function selectIssue(issue) {
    if (issue.variant) variants.variantId.value = issue.variant
    open.issues = false
    if (issue.nodeId) selection.select(issue.nodeId)
  }

  return reactive({
    props,
    definition,
    stage,
    open,
    /** Undo and redo: `change`, `checkpoint`, `undo`, `redo`, `canUndo`, `canRedo`. */
    history,
    /** The variant being edited, and the tree as it arranges it. */
    variants,
    /** What's selected, and where its editor anchors. */
    selection,
    /** The actions on the selected element. */
    editing,
    /** Sample, width, theme and Rules. */
    preview,
    issues,
    errors,
    onStageClick,
    selectIssue,
    publish: () => events.publish(definition.value),
  })
}

/** @typedef {ReturnType<typeof createStudio>} Studio */

const STUDIO = Symbol('loom-studio')

export const provideStudio = (studio) => provide(STUDIO, studio)

/** The studio, inside `<LoomStudio>`. */
export function useStudio() {
  const studio = inject(STUDIO)
  if (!studio) throw new Error('[loom-studio] useStudio() is only available inside <LoomStudio>')
  return studio
}
