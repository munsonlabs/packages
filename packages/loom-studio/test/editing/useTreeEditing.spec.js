import { describe, expect, it } from 'vite-plus/test'
import { ref } from 'vue'
import { useSelection } from '@/canvas/useSelection'
import { useHistory } from '@/editing/useHistory'
import { useTreeEditing } from '@/editing/useTreeEditing'
import { useVariantEditing } from '@/editing/useVariantEditing'
import { inScope, kit, model } from '@test/fixtures'

function setup() {
  const definition = model()
  return inScope(() => {
    const history = useHistory(definition)
    const variants = useVariantEditing(definition, history.change)
    const selection = useSelection({ definition, tree: variants.tree, stage: ref() })
    const editing = useTreeEditing({ kit: () => kit, definition, change: history.change, variants, selection })
    return { definition, variants, selection, editing }
  })
}

const childIds = (node) => node.children?.map((c) => c.id)

describe('useTreeEditing', () => {
  it('on the base: adds inside a container, moves, duplicates and deletes', () => {
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

  it('in a variant: moves become order, delete hides, and adding is off', () => {
    const { definition, variants, selection, editing } = setup()
    variants.variantId.value = 'small'
    selection.select('body')
    editing.moveBy(-1)
    expect(definition.value.variants[0].overrides).toEqual({ root: { order: ['body', 'title', 'more'] } })
    editing.remove()
    expect(definition.value.variants[0].overrides.body).toEqual({ hidden: true })
    editing.add('Text')
    expect(childIds(definition.value.root)).toEqual(['title', 'body', 'more'])
  })

  it('in a variant: nesting is off too, so the base keeps its structure', () => {
    const { definition, variants, selection, editing } = setup()
    variants.variantId.value = 'small'
    selection.select('link')
    editing.outdent()
    expect(childIds(definition.value.root)).toEqual(['title', 'body', 'more'])
    expect(childIds(definition.value.root.children[2])).toEqual(['link'])
    expect(definition.value.variants[0].overrides).toBeUndefined()
  })

  it('edits a node directly on the base, and as the smallest override in a variant', () => {
    const { definition, variants, selection, editing } = setup()
    selection.select('body')
    editing.editNode((n) => (n.props = { text: 'New' }))
    expect(definition.value.root.children[1].props).toEqual({ text: 'New' })

    variants.variantId.value = 'small'
    editing.editNode((n) => (n.props = { ...n.props, variant: 'caption' }))
    expect(definition.value.root.children[1].props).toEqual({ text: 'New' })
    expect(definition.value.variants[0].overrides).toEqual({ body: { props: { variant: 'caption' } } })
  })
})
