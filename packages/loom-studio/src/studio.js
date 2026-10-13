import { computed, inject, nextTick, provide, reactive, ref, shallowRef, watch } from 'vue'
import { hasErrors, validateDefinition } from '@munsonlabs/loom'
import { useCanvasDrag } from './canvas/useCanvasDrag'
import { useSelection } from './canvas/useSelection'
import { findNode } from './editing/tree'
import { useHistory } from './editing/useHistory'
import { useTreeEditing } from './editing/useTreeEditing'
import { useVariantEditing } from './editing/useVariantEditing'
import { framesFor } from './preview/frames'
import { useCallLog } from './preview/useCallLog'
import { usePreview } from './preview/usePreview'
import { useStudioTour } from './tour/useStudioTour'

/**
 * What `<LoomStudio>` takes, as the studio reads it.
 *
 * @typedef {object} StudioProps
 * @property {Kit} kit
 * @property {unknown[]} samples
 * @property {unknown} [context]
 * @property {boolean} tour
 * @property {WidgetDefinition[]} [library]
 * @property {KindSpec[]} [kinds]
 */

/**
 * @typedef {object} StudioEvents
 * @property {(definition: WidgetDefinition) => void} publish
 * @property {(library: LoadedLibrary) => void} importLibrary
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

  /** The canvas element. The canvas sets it. */
  const canvas = ref()
  /**
   * The frame being edited: selection, drag and the tour look inside it. Looked up when read, since
   * which frame that is changes with the preview.
   */
  const stage = {
    get value() {
      return canvas.value?.querySelector('[data-focused-frame]') ?? canvas.value
    },
  }
  /** The element editor, for the tour to point at. */
  const inspectorEl = shallowRef()

  /** Which popovers and dialogs are open; `closeAll()` closes every one. */
  const open = reactive({
    layers: false,
    variants: false,
    theme: false,
    issues: false,
    calls: false,
    palette: false,
    export: false,
    import: false,
    closeAll() {
      for (const [name, value] of Object.entries(open)) if (value === true) open[name] = false
    },
  })

  const history = useHistory(definition)
  const variants = useVariantEditing(definition, history.change)
  const selection = useSelection({ definition, tree: variants.tree, stage })
  const editing = useTreeEditing({ kit, definition, change: history.change, variants, selection })
  const preview = usePreview({ kit, samples: () => props.samples, definition })
  const callLog = useCallLog({ context: () => props.context, describe: preview.describe })

  // Keep the popover anchored to the element as edits re-render it.
  watch([variants.rendered, variants.variantId], () => void nextTick(selection.locate), { flush: 'post' })

  const drag = useCanvasDrag({
    stage,
    enabled: () => preview.mode.value === 'edit',
    rootId: () => definition.value.root.id,
    isContainer: (id) => {
      const node = findNode(variants.tree.value.root, id)
      return !!node && editing.isContainerNode(node)
    },
    labelFor: (id) => {
      const node = findNode(variants.tree.value.root, id)
      return node ? `${props.kit.blocks[node.type]?.label ?? node.type} #${id}` : `#${id}`
    },
    canDrop: editing.canDrop,
    onDrop: editing.drop,
  })
  watch(drag.dragging, (d) => {
    if (d) selection.popoverOpen.value = false
  })

  /** The frames the canvas draws, side by side: one, or one per width, variant, sample or scheme. */
  const frames = computed(() =>
    framesFor(preview.frameMode.value, {
      viewport: preview.viewport.value,
      followRules: preview.followRules.value,
      variantId: variants.variantId.value,
      variantOptions: variants.variantOptions.value,
      matchingSamples: preview.matchingSamples.value,
      describe: preview.describe,
      sampleIndex: preview.sampleIndex.value,
      previewScheme: preview.previewScheme.value,
      activeScheme: preview.activeScheme.value,
    }),
  )

  /** Makes a frame the one being edited, by giving the preview its width, variant, sample or scheme. */
  function focusFrame(frame) {
    const { viewport, variantId, sampleIndex, previewScheme } = frame.focus
    if (viewport) preview.viewport.value = viewport
    if (variantId) variants.variantId.value = variantId
    if (sampleIndex !== undefined) preview.sampleIndex.value = sampleIndex
    if (previewScheme) preview.previewScheme.value = previewScheme
  }

  // Keep the popover on the frame being edited when another becomes it.
  watch(
    () => frames.value.find((f) => f.focused)?.key,
    () => void nextTick(selection.locate),
    { flush: 'post' },
  )

  function toggleMode() {
    preview.mode.value = preview.mode.value === 'edit' ? 'interact' : 'edit'
    if (preview.mode.value === 'interact') selection.popoverOpen.value = false
  }

  /** A click on the canvas: selects in edit mode; in Try mode, the widget handles it. */
  function onStageClick(e) {
    if (drag.consumeClick()) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    if (preview.mode.value !== 'edit') return
    e.preventDefault()
    e.stopPropagation()
    // A click in another frame makes that frame the one being edited first.
    const frame = frames.value.find((f) => f.key === e.target.closest('[data-frame]')?.dataset.frame)
    if (frame && !frame.focused) focusFrame(frame)
    selection.select(e.target.closest('[data-node-id]')?.dataset.nodeId)
  }

  // --- Validation
  const issues = computed(() => validateDefinition(props.kit, definition.value))
  /** Errors stop publishing; warnings (a colour that won't follow dark mode) don't. */
  const errors = computed(() => hasErrors(issues.value))
  function selectIssue(issue) {
    if (issue.variant) variants.variantId.value = issue.variant
    open.issues = false
    if (issue.nodeId) selection.select(issue.nodeId)
  }

  const tour = useStudioTour({
    autoStart: () => props.tour,
    definition,
    tree: variants.tree,
    stage,
    inspectorEl,
    selection,
    isContainerNode: editing.isContainerNode,
    reset: () => {
      preview.mode.value = 'edit'
      open.closeAll()
    },
  })

  return reactive({
    props,
    definition,
    canvas,
    inspectorEl,
    open,
    /** Undo and redo: `change`, `checkpoint`, `undo`, `redo`, `canUndo`, `canRedo`. */
    history,
    /** The variant being edited, and the tree as it arranges it. */
    variants,
    /** What's selected, and where its editor anchors. */
    selection,
    /** The actions on the selected element. */
    editing,
    /** Sample, width, theme, scheme, Rules and Try mode. */
    preview,
    /** Calls the previewed widget made to the app. */
    callLog,
    drag,
    tour,
    issues,
    errors,
    /** The frames the canvas draws; the focused one is where editing happens. */
    frames,
    focusFrame,
    toggleMode,
    onStageClick,
    selectIssue,
    publish: () => events.publish(definition.value),
    importLibrary: events.importLibrary,
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
