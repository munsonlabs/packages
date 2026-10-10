import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import Widget from '@/Widget.vue'
import { createKit, provideKit } from '@/kit'
import { validateDefinition } from '@/definitions/validate'
import { bindableValues } from '@/definitions/paths'
import { actionsSource, makeKit, makeProducts, makeShop, productCard, productSource } from '@test/fixtures'

enableAutoUnmount(afterEach)

function render(props = {}, productIndex = 0) {
  const products = makeProducts()
  const shop = makeShop()
  const kit = makeKit()
  const wrapper = mount(Widget, {
    props: { kit, definition: productCard, data: products[productIndex], index: 4, context: shop, variant: 'base', ...props },
  })
  return { wrapper, shop, products, kit }
}

describe('<Widget>', () => {
  it('renders the data through the kit’s sources', () => {
    const { wrapper } = render()
    expect(wrapper.find('[data-node-id="title"]').text()).toBe('Teapot')
    expect(wrapper.find('[data-node-id="category"]').text()).toBe('Kitchen')
    expect(wrapper.find('[data-node-id="price"]').text()).toBe('£24')
    expect(wrapper.find('[data-node-id="image"] img').attributes('src')).toBe('/teapot.jpg')
    expect(wrapper.element.style.getPropertyValue('--w-accent')).toBe('#c2410c')
  })

  it('repeats children per item, resolving item paths', () => {
    const { wrapper } = render()
    expect(wrapper.findAll('[data-node-id="related-title"]').map((n) => n.text())).toEqual(['Matching mug', 'Spare lid'])
  })

  it('runs actions with the context, without bubbling to clickable ancestors', async () => {
    const { wrapper, shop, products } = render()
    await wrapper.find('[data-node-id="add"]').trigger('click')
    expect(shop.cart.add).toHaveBeenCalledWith(products[0])
    expect(shop.open).not.toHaveBeenCalled()
    await nextTick()
    expect(wrapper.find('[data-node-id="add"]').text()).toBe('In basket')
  })

  it('gives each repeated row its position as `repeat`', () => {
    const definition = {
      version: 2,
      id: 'list',
      name: 'List',
      root: {
        id: 'rows',
        type: 'Repeat',
        bind: { items: 'product.related' },
        children: [
          { id: 'n', type: 'Text', bind: { text: 'repeat.number' }, props: { suffix: '.' } },
          { id: 'name', type: 'Text', bind: { text: 'item.title' } },
          { id: 'rule', type: 'Divider', if: '!repeat.last' },
        ],
      },
    }
    const { wrapper, kit } = render({ definition })
    expect(wrapper.findAll('[data-node-id="n"]').map((n) => n.text())).toEqual(['1.', '2.'])
    expect(wrapper.findAll('[data-node-id="rule"]')).toHaveLength(1)
    expect(validateDefinition(kit, definition)).toEqual([])
    expect(
      bindableValues(kit, definition, 'n')
        .filter((o) => o.source === 'repeat')
        .map((o) => o.path),
    ).toEqual(['repeat.index', 'repeat.number', 'repeat.first', 'repeat.last', 'repeat.count'])
    expect(validateDefinition(kit, { ...definition, root: { id: 'x', type: 'Text', bind: { text: 'repeat.number' } } })).toHaveLength(1)
  })

  it('passes an action’s argument, and calls it with none otherwise', async () => {
    const { wrapper, shop, products } = render()
    await wrapper.findAll('[data-node-id="related-title"]')[1].trigger('click')
    expect(shop.open).toHaveBeenLastCalledWith(products[0].related[1])
    await wrapper.find('[data-node-id="card"]').trigger('click')
    expect(shop.open).toHaveBeenLastCalledWith(products[0])
  })

  it('hides nodes whose condition is falsy, reactively', async () => {
    const { wrapper, products } = render()
    expect(wrapper.find('[data-node-id="related"]').exists()).toBe(true)
    products[0].related = []
    await nextTick()
    expect(wrapper.find('[data-node-id="related"]').exists()).toBe(false)
  })

  it('reaches sources added to the definition after mount', async () => {
    const { wrapper } = render({
      definition: { ...productCard, variants: undefined, root: { id: 't', type: 'Text', bind: { text: 'product.category' } } },
    })
    expect(wrapper.find('[data-node-id="t"]').text()).toBe('Kitchen')
    await wrapper.setProps({ definition: { ...productCard, variants: undefined, root: { id: 't', type: 'Text', bind: { text: 'product.price' } } } })
    expect(wrapper.find('[data-node-id="t"]').text()).toBe('£24')
  })

  it('sets each source up once, however many bindings reach it', () => {
    const setup = vi.fn(productSource.setup)
    const kit = createKit({ sources: [{ ...productSource, setup }] })
    mount(Widget, { props: { kit, definition: productCard, data: makeProducts()[0], context: makeShop(), variant: 'base' } })
    expect(setup).toHaveBeenCalledTimes(1)
  })

  it('follows the data prop to another item', async () => {
    const { wrapper, products } = render()
    await wrapper.setProps({ data: products[1] })
    expect(wrapper.find('[data-node-id="title"]').text()).toBe('Kettle')
  })

  it('takes the kit and context from provideKit()', () => {
    const kit = makeKit()
    const shop = makeShop()
    const product = makeProducts()[0]
    const Host = defineComponent({
      setup() {
        provideKit(kit, shop)
        return () => h(Widget, { definition: productCard, data: product, variant: 'base' })
      },
    })
    expect(mount(Host).find('[data-node-id="title"]').text()).toBe('Teapot')
  })

  it('picks the first of `definitions` that matches the data, or renders the fallback slot', () => {
    const kit = makeKit()
    const [teapot, , bundle] = makeProducts()
    const ok = mount(Widget, { props: { kit, definitions: [productCard], data: teapot, context: makeShop() } })
    expect(ok.attributes('data-widget')).toBe('product-card')

    const none = mount(Widget, {
      props: { kit, definitions: [productCard], data: bundle, context: makeShop() },
      slots: { fallback: ({ data }) => h('em', `No widget for ${data.title}`) },
    })
    expect(none.text()).toBe('No widget for Tea set')
  })

  it('renders a kit’s own blocks with resolved props and node attrs', async () => {
    const Stars = defineComponent({ props: { value: Number }, setup: (p) => () => h('span', '★'.repeat(p.value ?? 0)) })
    const kit = createKit({
      sources: [
        productSource,
        { id: 'shop', label: 'Shop', fields: { addToCart: { type: 'action' } }, setup: (c) => ({ addToCart: () => c.context.cart.add(c.data) }) },
      ],
      blocks: [
        {
          type: 'Stars',
          label: 'Stars',
          description: 'Stars',
          container: false,
          props: { value: { type: 'number', label: 'Value' } },
          clickable: true,
          component: Stars,
        },
      ],
    })
    const shop = makeShop()
    const definition = {
      version: 2,
      id: 'r',
      name: 'R',
      root: { id: 'stars', type: 'Stars', props: { value: 3 }, on: { click: 'shop.addToCart' } },
    }
    const wrapper = mount(Widget, { props: { kit, definition, data: makeProducts()[0], context: shop } })

    const node = wrapper.find('[data-node-id="stars"]')
    expect(node.text()).toBe('★★★')
    expect(node.classes()).toContain('w-stars')
    await node.trigger('click')
    expect(shop.cart.add).toHaveBeenCalled()
  })
})

describe('createKit', () => {
  it('refuses reserved, duplicate and built-in names', () => {
    expect(() => createKit({ sources: [{ ...productSource, id: 'item' }] })).toThrow('reserved')
    expect(() => createKit({ sources: [{ ...productSource, id: 'repeat' }] })).toThrow('reserved')
    expect(() => createKit({ sources: [productSource, productSource] })).toThrow('share the id')
    const Text = defineComponent({ render: () => null })
    expect(() => createKit({ blocks: [{ type: 'Text', label: 'T', description: '', container: false, props: {}, component: Text }] })).toThrow(
      'built-in',
    )
  })
})

describe('a kit guard', () => {
  const mountWith = (guard) => {
    const shop = makeShop()
    const products = makeProducts()
    const kit = createKit({ sources: [productSource, actionsSource], guard })
    const wrapper = mount(Widget, { props: { kit, definition: productCard, data: products[0], index: 2, context: shop, variant: 'base' } })
    return { wrapper, shop, products }
  }

  it('sees every action first, with its argument and the widget’s data, index and context', async () => {
    const guard = vi.fn(() => true)
    const { wrapper, shop, products } = mountWith(guard)
    await wrapper.findAll('[data-node-id="related-title"]')[1].trigger('click')
    expect(guard).toHaveBeenCalledWith({
      action: 'shop.open',
      arg: products[0].related[1],
      node: 'related-title',
      data: products[0],
      index: 2,
      context: shop,
    })
    expect(shop.open).toHaveBeenCalledWith(products[0].related[1])
  })

  it('stops an action by returning false, so the kit can do something else instead', async () => {
    const paywall = vi.fn()
    const { wrapper, shop } = mountWith(({ action, context }) => {
      if (action === 'shop.addToCart') return true
      paywall(context)
      return false
    })
    await wrapper.find('[data-node-id="card"]').trigger('click')
    expect(shop.open).not.toHaveBeenCalled()
    expect(paywall).toHaveBeenCalledWith(shop)
    await wrapper.find('[data-node-id="add"]').trigger('click')
    expect(shop.added).toEqual(['p1'])
  })

  it('may answer later: the action runs once it resolves to anything but false', async () => {
    let answer
    const { wrapper, shop } = mountWith(() => new Promise((resolve) => (answer = resolve)))
    await wrapper.find('[data-node-id="card"]').trigger('click')
    expect(shop.open).not.toHaveBeenCalled()
    answer(true)
    await new Promise((resolve) => setTimeout(resolve))
    expect(shop.open).toHaveBeenCalledTimes(1)
  })
})
