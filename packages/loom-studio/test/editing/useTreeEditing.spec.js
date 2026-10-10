import { describe, expect, it } from 'vite-plus/test'
import { ref } from 'vue'
import { useSelection } from '@/canvas/useSelection'
import { useHistory } from '@/editing/useHistory'
import { useTreeEditing } from '@/editing/useTreeEditing'
import { inScope, kit, model } from '@test/fixtures'

function setup() {
  const definition = model()
  return inScope(() => {
    const history = useHistory(definition)
    const selection = useSelection({ definition, stage: ref() })
    const editing = useTreeEditing({ kit: () => kit, definition, change: history.change, selection })
    return { definition, selection, editing }
  })
}

const childIds = (node) => node.children?.map((c) => c.id)

describe('useTreeEditing', () => {
  it('adds inside a container, moves, duplicates and deletes', () => {
    const { definition, selection, editing } = setup()
    selection.select('more')
    editing.add('Text')
    expect(childIds(definition.value.root.children[2])).toHaveLength(2)

    selection.select('body')
    editing.moveBy(-1)
    expect(childIds(definition.value.root)).toEqual(['body', 'title', 'more'])
    editing.duplicate()
    expect(childIds(definition.value.root)).toHaveLength(4)
    selection.select('title')
    editing.remove()
    expect(childIds(definition.value.root)).not.toContain('title')
  })

  it('edits a node', () => {
    const { definition, selection, editing } = setup()
    selection.select('body')
    editing.editNode((n) => (n.props = { text: 'New' }))
    expect(definition.value.root.children[1].props).toEqual({ text: 'New' })
  })
})
