import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { validateDefinition } from '@/definitions/validate'
import { bindableValues, sourcesUsed } from '@/definitions/paths'
import { createDefinition, createKit, matchDefinition, matchKind } from '@/kit'
import { applyVariant, matchVariant, ruleMatches, variantTree, widthToSize } from '@/definitions/variants'
import Widget from '@/Widget.vue'
import { videoBlock } from '@/blocks/video'
import { makeKit, makeProducts, makeShop, productCard, productSource } from '@test/fixtures'

enableAutoUnmount(afterEach)

const kit = makeKit()
const withRoot = (root, extra = {}) => ({ version: 2, id: 't', name: 'T', root, ...extra })
const ids = (node) => [node.id, ...(node.children ?? []).flatMap(ids)]
const find = (node, id) => (node.id === id ? node : node.children?.map((c) => find(c, id)).find(Boolean))

describe('validateDefinition', () => {
  it('accepts the product card', () => {
    expect(validateDefinition(kit, productCard)).toEqual([])
  })

  it('rejects paths the kit has no source for', () => {
    expect(validateDefinition(kit, withRoot({ id: 'a', type: 'Text', bind: { text: 'weather.today' } }))).toEqual([
      { nodeId: 'a', message: '"weather.today" isn\'t in scope' },
    ])
  })

  it('rejects values bound as actions, actions bound as values, and mismatched types', () => {
    const issues = validateDefinition(
      kit,
      withRoot({
        id: 'root',
        type: 'Stack',
        children: [
          { id: 'b', type: 'Button', on: { click: 'product.title' } },
          { id: 't', type: 'Text', bind: { text: 'shop.addToCart' } },
          { id: 'n', type: 'Text', bind: { text: 'product.onSale' } },
        ],
      }),
    )
    expect(issues.map((i) => i.nodeId)).toEqual(['b', 't', 'n'])
  })

  it('flags unknown blocks and kinds, duplicate ids and children on leaves', () => {
    const issues = validateDefinition(kit, withRoot({ id: 'a', type: 'Text', children: [{ id: 'a', type: 'Marquee' }] }, { kind: 'recipe' }))
    expect(issues.map((i) => i.message)).toEqual([
      'Unknown kind "recipe"',
      "Text can't have children",
      'Duplicate node id "a"',
      'Unknown block "Marquee"',
    ])
  })

  it('checks variants: their nodes, orders, rules, and the tree each renders', () => {
    const issues = validateDefinition(kit, {
      ...productCard,
      variants: [
        { id: 'base', label: 'Base', overrides: { ghost: { hidden: true }, meta: { order: ['title'] } } },
        { id: 'v', label: 'V', when: { if: 'shop.open', size: ['xl'] }, overrides: { title: { bind: { text: 'product.onSale' } } } },
      ],
    })
    expect(issues.map((i) => `${i.variant}: ${i.nodeId ?? ''} ${i.message}`)).toEqual([
      'base:  Variant id "base" is reserved or already used',
      "base: ghost Overrides a node that doesn't exist",
      'base: meta Orders "title", which isn\'t a child',
      'v:  Can\'t use action "shop.open" as a rule',
      'v:  Unknown size "xl"',
      'v: title Text.text can\'t take a boolean ("product.onSale")',
    ])
  })
})

describe('paths', () => {
  it('lists the Repeat item first inside it, then primary sources, then the kind’s', () => {
    const inside = bindableValues(kit, productCard, 'related-title').map((o) => o.path)
    expect(inside.slice(0, 2)).toEqual(['item', 'item.title'])
    expect(inside.indexOf('product.title')).toBeLessThan(inside.indexOf('shop.open'))
    expect(bindableValues(kit, productCard, 'title').some((o) => o.source === 'item')).toBe(false)
  })

  it('collects every source a definition uses, variants included', () => {
    expect(sourcesUsed(productCard)).toEqual(['product', 'shop'])
  })
})

describe('kinds', () => {
  it('match data and pick definitions', () => {
    const [teapot, , bundle] = makeProducts()
    expect(matchKind(kit, teapot)?.id).toBe('product')
    expect(matchKind(kit, bundle)).toBeUndefined()
    expect(matchDefinition(kit, teapot, [productCard])).toBe(productCard)
    expect(matchDefinition(kit, bundle, [productCard])).toBeUndefined()
  })

  it('start new definitions from their starter', () => {
    const def = createDefinition(kit, 'product', { id: 'mini', name: 'Mini' })
    expect(def).toMatchObject({ version: 2, id: 'mini', name: 'Mini', kind: 'product' })
    expect(validateDefinition(kit, def)).toEqual([])
    expect(() => createDefinition(kit, 'recipe', { id: 'x', name: 'X' })).toThrow('unknown kind')
  })
})

describe('variants', () => {
  it('hide, reorder, rebind and merge vars, leaving the base untouched', () => {
    const snapshot = JSON.stringify(productCard)
    const sale = applyVariant(productCard, 'sale')
    expect(ids(sale.root)).not.toContain('related')
    expect(sale.root.children.map((c) => c.id)).toEqual(['copy', 'image', 'meta'])
    expect(find(sale.root, 'category')).toMatchObject({ props: { variant: 'kicker', text: 'Sale' } })
    expect(find(sale.root, 'category')?.bind).toBeUndefined()
    expect(sale.vars).toMatchObject({ '--w-accent': '#dc2626', '--w-radius': '12px' })
    expect(JSON.stringify(productCard)).toBe(snapshot)
  })

  it('keep hidden nodes when asked, and report them', () => {
    const { root, hidden } = variantTree(productCard, 'compact', true)
    expect(ids(root)).toContain('image')
    expect([...hidden].sort()).toEqual(['image', 'related', 'summary'])
  })

  it('match by rule, first wins', () => {
    const ctx = (width, values = {}) => ({ width, readValue: (path) => values[path] })
    expect([0, 299, 300, 500].map(widthToSize)).toEqual(['sm', 'sm', 'md', 'lg'])
    expect(ruleMatches({}, ctx(100))).toBe(false)
    expect(ruleMatches({ minWidth: 200, maxWidth: 400 }, ctx(300))).toBe(true)
    expect(matchVariant(productCard, ctx(200, { 'product.onSale': true }))).toBe('sale')
    expect(matchVariant(productCard, ctx(200))).toBe('compact')
    expect(matchVariant(productCard, ctx(600))).toBeUndefined()
  })

  it('render by rule: data first, then measured size; a pinned variant wins', async () => {
    let report = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb) {
          report = cb
        }
        observe() {}
        disconnect() {}
      },
    )
    const [teapot, kettle] = makeProducts()
    const shop = makeShop()
    const onSale = mount(Widget, { props: { kit, definition: productCard, data: kettle, context: shop } })
    expect(onSale.attributes('data-variant')).toBe('sale')
    expect(onSale.find('[data-node-id="category"]').text()).toBe('Sale')

    const plain = mount(Widget, { props: { kit, definition: productCard, data: teapot, context: shop } })
    expect(plain.attributes('data-variant')).toBe('base')
    report([{ contentRect: { width: 280 } }], {})
    await nextTick()
    expect(plain.attributes('data-variant')).toBe('compact')
    expect(plain.emitted('variant')).toEqual([['base'], ['compact']])

    const pinned = mount(Widget, { props: { kit, definition: productCard, data: kettle, context: shop, variant: 'base' } })
    expect(pinned.find('[data-node-id="category"]').text()).toBe('Kitchen')
    vi.unstubAllGlobals()
  })
})

describe('taps', () => {
  it('are only allowed on blocks that can be tapped, and only as click', () => {
    const kit = makeKit()
    const on = (type, event = 'click') => ({ ...productCard, variants: undefined, root: { id: 'r', type, on: { [event]: 'shop.open' } } })
    expect(validateDefinition(kit, on('Stack'))).toEqual([])
    expect(validateDefinition(kit, on('Badge')).map((i) => i.message)).toEqual(["Badge can't be tapped"])
    expect(validateDefinition(kit, on('Stack', 'hover')).map((i) => i.message)).toEqual(['Widgets only handle "click", not "hover"'])
  })
})

describe('videoBlock', () => {
  it('renders a VideoCard for a source, and nothing without one', () => {
    const videoKit = createKit({ sources: [productSource], blocks: [videoBlock] })
    const definition = withRoot({ id: 'player', type: 'Video', bind: { src: 'product.image' } })
    const [teapot, kettle] = makeProducts()
    const withSrc = mount(Widget, { props: { kit: videoKit, definition, data: teapot, context: makeShop() } })
    expect(withSrc.find('[data-node-id="player"].w-video').exists()).toBe(true)
    const without = mount(Widget, { props: { kit: videoKit, definition, data: kettle, context: makeShop() } })
    expect(without.find('[data-node-id="player"]').exists()).toBe(false)
    expect(validateDefinition(videoKit, definition)).toEqual([])
  })
})
