import { describe, expect, it } from 'vite-plus/test'
import { validateDefinition } from '@/definitions/validate'
import { bindableValues } from '@/definitions/paths'
import { createDefinition, matchDefinition, matchKind } from '@/kit'
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

  it('flags unknown blocks and kinds, duplicate ids and children on leaves', () => {
    const issues = validateDefinition(kit, withRoot({ id: 'a', type: 'Text', children: [{ id: 'a', type: 'Marquee' }] }, { kind: 'recipe' }))
    expect(issues.map((i) => i.message)).toEqual([
      'Unknown kind "recipe"',
      "Text can't have children",
      'Duplicate node id "a"',
      'Unknown block "Marquee"',
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

describe('taps', () => {
  it('are only allowed on blocks that can be tapped, and only as click', () => {
    const kit = makeKit()
    const on = (type, event = 'click') => ({ ...productCard, root: { id: 'r', type, on: { [event]: 'shop.open' } } })
    expect(validateDefinition(kit, on('Stack'))).toEqual([])
    expect(validateDefinition(kit, on('Badge')).map((i) => i.message)).toEqual(["Badge can't be tapped"])
    expect(validateDefinition(kit, on('Stack', 'hover')).map((i) => i.message)).toEqual(['Widgets only handle "click", not "hover"'])
  })
})
