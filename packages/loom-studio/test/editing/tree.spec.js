import { describe, expect, it } from 'vite-plus/test'
import { canMoveTo, findNode, moveNodeTo, update } from '@/editing/tree'

const definition = {
  version: 2,
  id: 'w',
  name: 'W',
  root: {
    id: 'card',
    type: 'Stack',
    children: [
      { id: 'image', type: 'Image' },
      {
        id: 'copy',
        type: 'Stack',
        children: [
          { id: 'title', type: 'Text' },
          { id: 'summary', type: 'Text' },
        ],
      },
      { id: 'meta', type: 'Stack', children: [{ id: 'time', type: 'Text' }] },
    ],
  },
}

const isContainer = (node) => node.type === 'Stack'
const ids = (node) => node?.children?.map((c) => c.id)
const move = (id, targetId, position) => update(definition, (d) => moveNodeTo(d, id, targetId, position))

describe('moveNodeTo', () => {
  it('moves before and after siblings', () => {
    expect(ids(move('image', 'meta', 'after').root)).toEqual(['copy', 'meta', 'image'])
    expect(ids(move('meta', 'image', 'before').root)).toEqual(['meta', 'image', 'copy'])
  })

  it('moves across containers, and into one', () => {
    const across = move('time', 'title', 'before')
    expect(ids(findNode(across.root, 'copy'))).toEqual(['time', 'title', 'summary'])
    expect(ids(findNode(across.root, 'meta'))).toEqual([])

    const inside = move('image', 'meta', 'inside')
    expect(ids(inside.root)).toEqual(['copy', 'meta'])
    expect(ids(findNode(inside.root, 'meta'))).toEqual(['time', 'image'])
  })

  it('leaves the original untouched', () => {
    move('image', 'meta', 'inside')
    expect(ids(definition.root)).toEqual(['image', 'copy', 'meta'])
  })
})

describe('canMoveTo', () => {
  const can = (id, targetId, position) => canMoveTo(definition.root, id, targetId, position, isContainer)

  it('allows moves anywhere sensible', () => {
    expect(can('time', 'title', 'after')).toBe(true)
    expect(can('image', 'copy', 'inside')).toBe(true)
  })

  it('refuses the root, itself, its own subtree, leaves as containers, and siblings of the root', () => {
    expect(can('card', 'meta', 'inside')).toBe(false)
    expect(can('copy', 'copy', 'after')).toBe(false)
    expect(can('copy', 'title', 'before')).toBe(false)
    expect(can('image', 'title', 'inside')).toBe(false)
    expect(can('image', 'card', 'before')).toBe(false)
  })
})
