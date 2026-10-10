import { onBeforeUnmount, ref, shallowRef } from 'vue'

/**
 * @typedef {object} DropTarget
 * @property {string} id
 * @property {DropPosition} position
 */

/**
 * @typedef {object} DropIndicator
 * @property {'line' | 'box'} kind A line between siblings, or a box around the container being dropped into.
 * @property {number} top
 * @property {number} left
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {object} Options
 * @property {Ref<HTMLElement | undefined>} stage
 * @property {() => boolean} enabled Dragging only starts while this is true (editing, not trying).
 * @property {() => string} rootId
 * @property {(id: string) => boolean} isContainer
 * @property {(id: string) => string} labelFor What the drag ghost calls the element.
 * @property {(dragId: string, target: DropTarget) => boolean} canDrop
 * @property {(dragId: string, target: DropTarget) => void} onDrop
 */

/** How far the pointer must travel before a press becomes a drag, so clicks still select. */
const THRESHOLD = 5

/**
 * Drag any element of the rendered widget onto another. The widget's DOM is loom's, not ours,
 * so this works on `[data-node-id]` elements directly: a press past a few pixels becomes a drag,
 * the element under the pointer becomes the target, and where the pointer sits within it decides
 * before, after or inside (for containers, the middle half).
 *
 * @param {Options} options
 */
export function useCanvasDrag(options) {
  const dragging = shallowRef()
  const target = shallowRef()
  const indicator = shallowRef()
  const pointer = ref({ x: 0, y: 0 })

  let pressed
  let suppressClick = false

  const nodeEl = (el) => el?.closest('[data-node-id]') ?? undefined

  function onPointerDown(e) {
    if (e.button !== 0 || !options.enabled()) return
    const el = nodeEl(e.target)
    const id = el?.dataset.nodeId
    if (!el || !id || id === options.rootId()) return
    pressed = { id, label: options.labelFor(id), x: e.clientX, y: e.clientY }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    // The browser can take the pointer away mid-drag (to scroll, say): that ends it without a drop.
    window.addEventListener('pointercancel', cancel)
  }

  function onPointerMove(e) {
    if (!pressed) return
    pointer.value = { x: e.clientX, y: e.clientY }
    if (!dragging.value) {
      if (Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) < THRESHOLD) return
      dragging.value = { id: pressed.id, label: pressed.label }
      document.body.style.userSelect = 'none'
    }
    track(e.clientX, e.clientY)
  }

  function track(x, y) {
    const drag = dragging.value
    const stage = options.stage.value
    const el = nodeEl(document.elementFromPoint(x, y))
    if (!drag || !stage || !el || !stage.contains(el)) return clearTarget()

    const id = el.dataset.nodeId
    const position = positionWithin(el, id, x, y)
    const candidate = { id, position }
    if (!options.canDrop(drag.id, candidate)) return clearTarget()

    target.value = candidate
    indicator.value = indicatorFor(el, position)
  }

  function positionWithin(el, id, x, y) {
    if (id === options.rootId()) return 'inside'
    const rect = el.getBoundingClientRect()
    const horizontal = flowOf(el) === 'row'
    const t = horizontal ? (x - rect.left) / rect.width : (y - rect.top) / rect.height
    if (options.isContainer(id)) return t < 0.25 ? 'before' : t > 0.75 ? 'after' : 'inside'
    return t < 0.5 ? 'before' : 'after'
  }

  /** Which way siblings flow, from the nearest Stack or Repeat around the element. */
  function flowOf(el) {
    const container = el.parentElement?.closest('.w-stack, .w-repeat')
    return container && getComputedStyle(container).flexDirection.startsWith('row') ? 'row' : 'column'
  }

  function indicatorFor(el, position) {
    const r = el.getBoundingClientRect()
    if (position === 'inside') return { kind: 'box', top: r.top, left: r.left, width: r.width, height: r.height }
    const edge = position === 'before' ? 0 : 1
    return flowOf(el) === 'row'
      ? { kind: 'line', top: r.top, left: r.left + r.width * edge - 1, width: 3, height: r.height }
      : { kind: 'line', top: r.top + r.height * edge - 1, left: r.left, width: r.width, height: 3 }
  }

  function clearTarget() {
    target.value = undefined
    indicator.value = undefined
  }

  function onPointerUp() {
    const drag = dragging.value
    const drop = target.value
    if (drag) {
      // The click that ends a drag mustn't also select whatever is under the pointer.
      suppressClick = true
      setTimeout(() => (suppressClick = false))
      if (drop) options.onDrop(drag.id, drop)
    }
    cancel()
  }

  /** Ends the press or drag without dropping, and stops listening. */
  function cancel() {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', cancel)
    pressed = undefined
    dragging.value = undefined
    document.body.style.userSelect = ''
    clearTarget()
  }

  /** True once, right after a drag ends: the stage's click handler should ignore that click. */
  function consumeClick() {
    const was = suppressClick
    suppressClick = false
    return was
  }

  onBeforeUnmount(cancel)

  return { dragging, target, indicator, pointer, onPointerDown, cancel, consumeClick }
}
