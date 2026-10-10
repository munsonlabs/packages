import { computed, onMounted, watch } from 'vue'
import { useTour } from '@nuxt/ui/composables'
import { listNodes } from '../editing/tree'
import { tourSteps } from './steps'

const TOUR_SEEN = 'loom-studio:tour-seen'

/**
 * @typedef {object} Options
 * @property {() => boolean} autoStart Start it on a first visit (remembered per browser).
 * @property {Ref<WidgetDefinition>} definition
 * @property {Ref<{ root: WidgetNode }>} tree
 * @property {Ref<HTMLElement | undefined>} stage
 * @property {ShallowRef<HTMLElement | undefined>} inspectorEl
 * @property {Selection} selection
 * @property {(node: WidgetNode) => boolean} isContainerNode
 * @property {() => void} reset Puts the studio in a state to tour: editing, no popovers open.
 */

/**
 * The guided tour. It runs over the real UI, on the person's own widget: steps select an
 * element so its editor is there to point at, then close it again. Each step's target gets a
 * `data-tour-active` ring.
 *
 * @param {Options} options
 */
export function useStudioTour({ autoStart, definition, tree, stage, inspectorEl, selection, isContainerNode, reset }) {
  const { selectedId, selectedEl, anchoredToSelf, popoverOpen, select, elementFor } = selection

  /** An element worth demonstrating: a rendered, bound leaf like a headline, else anything rendered. */
  function demoNodeId() {
    const nodes = listNodes(tree.value.root)
      .map(({ node }) => node)
      .filter((node) => node.id !== definition.value.root.id && elementFor(node.id))
    return (nodes.find((node) => node.type === 'Text' && node.bind) ?? nodes.find((node) => node.bind && !isContainerNode(node)) ?? nodes[0])?.id
  }

  const tour = useTour(
    tourSteps({
      widget: () => stage.value?.querySelector('.w-root'),
      inspector: () => inspectorEl.value,
      selection: () => selectedEl.value,
      openEditor: () => {
        const keep = selectedId.value && anchoredToSelf.value ? selectedId.value : undefined
        select(keep ?? demoNodeId())
      },
      closeEditor: () => {
        if (!selectedId.value || !anchoredToSelf.value) select(demoNodeId(), false)
        else popoverOpen.value = false
      },
      clearSelection: () => select(undefined),
    }),
  )

  const step = computed(() => tour.current.value)

  watch([tour.open, tour.index], ([open]) => {
    if (open) step.value?.enter?.()
  })

  // Ring whatever the step points at.
  watch(tour.reference, (next, previous) => {
    if (previous instanceof Element) previous.removeAttribute('data-tour-active')
    if (next instanceof Element && tour.open.value) next.setAttribute('data-tour-active', '')
  })

  watch(tour.open, (open) => {
    if (open) return
    if (tour.reference.value instanceof Element) tour.reference.value.removeAttribute('data-tour-active')
    try {
      localStorage.setItem(TOUR_SEEN, '1')
    } catch {
      // Blocked storage only means the tour may show again next time.
    }
  })

  function start() {
    reset()
    tour.start(0)
  }

  onMounted(() => {
    let seen = false
    try {
      seen = localStorage.getItem(TOUR_SEEN) === '1'
    } catch {
      // No storage: treat as seen rather than showing the tour on every visit.
      seen = true
    }
    if (autoStart() && !seen) setTimeout(start, 600)
  })

  return {
    open: tour.open,
    index: tour.index,
    step,
    reference: tour.reference,
    total: tour.total,
    hasNext: tour.hasNext,
    hasPrev: tour.hasPrev,
    next: tour.next,
    prev: tour.prev,
    finish: tour.finish,
    start,
  }
}
