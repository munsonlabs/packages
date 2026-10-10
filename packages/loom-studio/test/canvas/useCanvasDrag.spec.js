import { describe, expect, it, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { useCanvasDrag } from '@/canvas/useCanvasDrag'
import { inScope } from '@test/fixtures'

function setup() {
  document.body.innerHTML = '<div id="stage"><div data-node-id="root"><div data-node-id="title">Hi</div></div></div>'
  // The test DOM has no layout, so nothing is ever under the pointer: these tests are about the press and its end.
  document.elementFromPoint ??= () => null
  const stage = ref(document.getElementById('stage'))
  const onDrop = vi.fn()
  const drag = inScope(() =>
    useCanvasDrag({ stage, enabled: () => true, rootId: () => 'root', isContainer: () => false, labelFor: (id) => id, canDrop: () => true, onDrop }),
  )
  const title = stage.value.querySelector('[data-node-id="title"]')
  title.addEventListener('pointerdown', drag.onPointerDown)
  return { drag, onDrop, title }
}

const pointer = (type, x = 0, y = 0) => new PointerEvent(type, { bubbles: true, clientX: x, clientY: y })

describe('useCanvasDrag', () => {
  it('a press becomes a drag only past the threshold', () => {
    const { drag, title } = setup()
    title.dispatchEvent(pointer('pointerdown'))
    window.dispatchEvent(pointer('pointermove', 2, 2))
    expect(drag.dragging.value).toBeUndefined()
    window.dispatchEvent(pointer('pointermove', 20, 20))
    expect(drag.dragging.value).toMatchObject({ id: 'title' })
    window.dispatchEvent(pointer('pointerup'))
    expect(drag.dragging.value).toBeUndefined()
    expect(drag.consumeClick()).toBe(true)
  })

  it('a cancelled pointer ends the drag without dropping, and a later pointerup is ignored', () => {
    const { drag, onDrop, title } = setup()
    title.dispatchEvent(pointer('pointerdown'))
    window.dispatchEvent(pointer('pointermove', 20, 20))
    expect(drag.dragging.value).toBeDefined()
    window.dispatchEvent(pointer('pointercancel'))
    expect(drag.dragging.value).toBeUndefined()
    window.dispatchEvent(pointer('pointerup'))
    expect(onDrop).not.toHaveBeenCalled()
    expect(drag.consumeClick()).toBe(false)
  })
})
