import { describe, expect, it } from 'vite-plus/test'
import { variantTree } from '@munsonlabs/loom/editor'
import { dropPosition, layerRows } from '@/layers/layers'
import { card, kit } from '@test/fixtures'

describe('layerRows', () => {
  it('lists the tree depth first, with labels and hints, skipping collapsed children', () => {
    const rows = layerRows(kit, variantTree(card(), 'base', true), new Set())
    expect(rows.map((r) => [r.id, r.depth, r.label, r.hint])).toEqual([
      ['root', 0, 'Stack', undefined],
      ['title', 1, 'Text', 'note.title'],
      ['body', 1, 'Text', '“Body”'],
      ['more', 1, 'Stack', undefined],
      ['link', 2, 'Link', undefined],
    ])
    expect(layerRows(kit, variantTree(card(), 'base', true), new Set(['more'])).map((r) => r.id)).not.toContain('link')
  })

  it('marks what a variant hides, and what sits inside it', () => {
    const definition = { ...card(), variants: [{ id: 'small', label: 'Small', overrides: { more: { hidden: true } } }] }
    const rows = layerRows(kit, variantTree(definition, 'small', true), new Set())
    expect(rows.find((r) => r.id === 'more')).toMatchObject({ hidden: true, insideHidden: false })
    expect(rows.find((r) => r.id === 'link')).toMatchObject({ hidden: false, insideHidden: true })
  })
})

describe('dropPosition', () => {
  const row = { top: 100, height: 40 }
  it('splits a container into before, inside and after, and anything else in half', () => {
    expect([105, 120, 135].map((y) => dropPosition(y, row, true))).toEqual(['before', 'inside', 'after'])
    expect([105, 135].map((y) => dropPosition(y, row, false))).toEqual(['before', 'after'])
  })
})
