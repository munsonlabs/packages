import { describe, expect, it } from 'vite-plus/test'
import { createKit } from '@/kit'
import { createLibrary, LibraryError, loadLibrary } from '@/definitions/library'
import { actionsSource, productCard, productKind, productSource } from '@test/fixtures'

const kit = createKit({ id: 'shop', sources: [productSource, actionsSource], kinds: [productKind] })

const mini = {
  version: 2,
  id: 'mini',
  name: 'Mini',
  kind: 'product',
  root: { id: 'card', type: 'Stack', children: [{ id: 'title', type: 'Text', bind: { text: 'product.title' } }] },
}

describe('createLibrary', () => {
  it('bundles widgets in order, with the kit, date, sources and blocks they need', () => {
    const library = createLibrary(kit, [productCard, mini], { publishedAt: new Date('2026-10-10T09:00:00Z') })
    expect(library).toMatchObject({ format: 'loom-library', version: 1, kit: 'shop', publishedAt: '2026-10-10T09:00:00.000Z' })
    expect(library.widgets.map((w) => w.id)).toEqual(['product-card', 'mini'])
    expect(library.sources).toEqual(['product', 'shop'])
    expect(library.blocks).toEqual(['Button', 'Image', 'Repeat', 'Stack', 'Text'])
  })

  it('leaves out the kit when it has no id', () => {
    expect(createLibrary(createKit(), [mini])).not.toHaveProperty('kit')
  })
})

describe('loadLibrary', () => {
  it('round-trips through JSON', () => {
    const loaded = loadLibrary(kit, JSON.stringify(createLibrary(kit, [productCard, mini])))
    expect(loaded.widgets.map((w) => w.id)).toEqual(['product-card', 'mini'])
    expect(loaded).toMatchObject({ skipped: [], missing: { sources: [], blocks: [] } })
    expect(loaded.kitMismatch).toBeUndefined()
  })

  it('skips widgets that would not render here, saying why, and reports what the kit lacks', () => {
    const newer = createKit({
      id: 'shop',
      sources: [
        productSource,
        actionsSource,
        { id: 'reviews', label: 'Reviews', fields: { count: { type: 'number' } }, setup: () => ({ count: 3 }) },
      ],
      kinds: [productKind],
    })
    const usesNewThings = {
      ...mini,
      id: 'fancy',
      root: {
        id: 'card',
        type: 'Stack',
        children: [{ id: 'n', type: 'Text', bind: { text: 'reviews.count' } }],
      },
    }
    const loaded = loadLibrary(kit, createLibrary(newer, [mini, usesNewThings]))
    expect(loaded.widgets.map((w) => w.id)).toEqual(['mini'])
    expect(loaded.skipped.map((s) => [s.id, s.issues.map((i) => i.message)])).toEqual([['fancy', ['"reviews.count" isn\'t in scope']]])
    expect(loaded.missing).toEqual({ sources: ['reviews'], blocks: [] })
  })

  it('flags a library made for another kit', () => {
    const loaded = loadLibrary(kit, { ...createLibrary(kit, [mini]), kit: 'timeline' })
    expect(loaded.kitMismatch).toEqual({ expected: 'shop', actual: 'timeline' })
  })

  it('accepts a bare array of definitions, and skips one in an unknown format', () => {
    const old = { ...mini, id: 'old', version: 1 }
    const loaded = loadLibrary(kit, [mini, old])
    expect(loaded.widgets.map((w) => w.id)).toEqual(['mini'])
    expect(loaded.skipped.map((s) => s.issues[0].message)).toEqual(['Unsupported version 1, expected 2'])
  })

  it('refuses things that are not libraries, and newer formats', () => {
    expect(() => loadLibrary(kit, 'not json')).toThrow(LibraryError)
    expect(() => loadLibrary(kit, { hello: 'world' })).toThrow('Not a widget library')
    expect(() => loadLibrary(kit, { format: 'other', widgets: [] })).toThrow('Unknown format')
    expect(() => loadLibrary(kit, { format: 'loom-library', version: 9, widgets: [] })).toThrow('newer')
  })
})
