import { describe, expect, it } from 'vite-plus/test'
import { validateDefinition } from '@/definitions/validate'
import { bindableValues } from '@/definitions/paths'
import { conditionHolds, definitionMatches, matchDefinition } from '@/definitions/match'
import { makeKit, makeProducts, productCard } from '@test/fixtures'

const kit = makeKit()
const withRoot = (root, extra = {}) => ({ version: 2, id: 't', name: 'T', root, ...extra })

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

  it('flags malformed conditions, unknown blocks, duplicate ids and children on leaves', () => {
    const issues = validateDefinition(
      kit,
      withRoot(
        { id: 'a', type: 'Text', children: [{ id: 'a', type: 'Marquee' }] },
        {
          match: [
            { path: 'kind', op: 'is', value: 'x' },
            { path: 'tags', op: 'in' },
          ],
        },
      ),
    )
    expect(issues.map((i) => i.message)).toEqual([
      'Condition 1 has an unknown test "is"',
      'Condition 2 needs a list of values',
      "Text can't have children",
      'Duplicate node id "a"',
      'Unknown block "Marquee"',
    ])
  })
})

describe('paths', () => {
  it('lists the Repeat item first inside it, then primary sources, then the rest', () => {
    const inside = bindableValues(kit, productCard, 'related-title').map((o) => o.path)
    expect(inside.slice(0, 2)).toEqual(['item', 'item.title'])
    expect(inside.indexOf('product.title')).toBeLessThan(inside.indexOf('shop.open'))
    expect(bindableValues(kit, productCard, 'title').some((o) => o.source === 'item')).toBe(false)
  })

  it('offers only the sources a definition uses, when it says', () => {
    const scoped = { ...productCard, uses: ['product'] }
    expect(new Set(bindableValues(kit, scoped, 'title').map((o) => o.source))).toEqual(new Set(['product']))
    expect(validateDefinition(kit, scoped)).toContainEqual({ nodeId: 'card', message: '"shop.open" is from "shop", which this widget doesn\'t use' })
    expect(validateDefinition(kit, { ...productCard, uses: ['product', 'shop', 'weather'] })).toEqual([
      { message: 'Uses "weather", which this kit doesn\'t have' },
    ])
  })
})

describe('match', () => {
  it('tests the raw data, every condition at once', () => {
    const story = { entry: { type: 'article', tags: ['breaking'], section: 'News' } }
    expect(conditionHolds({ path: 'entry.type', op: 'equals', value: 'article' }, story)).toBe(true)
    expect(conditionHolds({ path: 'entry.type', op: 'in', value: ['video', 'gallery'] }, story)).toBe(false)
    expect(conditionHolds({ path: 'entry.tags', op: 'includes', value: 'breaking' }, story)).toBe(true)
    expect(conditionHolds({ path: '!entry.author', op: 'exists' }, story)).toBe(true)
    expect(
      definitionMatches(
        {
          match: [
            { path: 'entry.type', op: 'equals', value: 'article' },
            { path: 'entry.section', op: 'equals', value: 'Sport' },
          ],
        },
        story,
      ),
    ).toBe(false)
    expect(definitionMatches({}, story)).toBe(true)
  })

  it('picks the first definition that matches', () => {
    const [teapot, , bundle] = makeProducts()
    const anything = { ...productCard, id: 'anything', match: undefined }
    expect(matchDefinition(teapot, [productCard, anything])).toBe(productCard)
    expect(matchDefinition(bundle, [productCard, anything])).toBe(anything)
    expect(matchDefinition(teapot, [anything, productCard])).toBe(anything)
    expect(matchDefinition(bundle, [productCard])).toBeUndefined()
  })
})

describe('taps', () => {
  it('are only allowed on blocks that can be tapped, and only as click', () => {
    const kit = makeKit()
    const on = (type, event = 'click') => ({ ...productCard, root: { id: 'r', type, on: { [event]: 'shop.open' } } })
    expect(validateDefinition(kit, on('Stack'))).toEqual([])
    expect(validateDefinition(kit, on('Badge')).map((i) => i.message)).toEqual(["Badge can't be tapped"])
    expect(validateDefinition(kit, on('Stack', 'hover')).map((i) => i.message)).toEqual(['Widgets only handle "click", not "hover"'])
  })
})
