import { describe, expect, it } from 'vite-plus/test'
import { useHistory } from '@/editing/useHistory'
import { model } from '@test/fixtures'

describe('useHistory', () => {
  it('edits a copy, never the original, and undoes and redoes', () => {
    const definition = model()
    const original = definition.value
    const history = useHistory(definition)
    expect(history.canUndo.value).toBe(false)

    history.change((d) => (d.name = 'Renamed'))
    expect(definition.value.name).toBe('Renamed')
    expect(original.name).toBe('Card')
    expect(history.canUndo.value).toBe(true)

    history.undo()
    expect(definition.value).toBe(original)
    expect(history.canRedo.value).toBe(true)
    history.redo()
    expect(definition.value.name).toBe('Renamed')
  })

  it('forgets what was undone once something new is done, and keeps a limited past', () => {
    const definition = model()
    const history = useHistory(definition, 3)
    for (const name of ['a', 'b', 'c', 'd']) history.change((d) => (d.name = name))
    history.undo()
    history.change((d) => (d.name = 'e'))
    expect(history.canRedo.value).toBe(false)
    let steps = 0
    while (history.canUndo.value) {
      history.undo()
      steps++
    }
    expect(steps).toBe(3)
  })
})
