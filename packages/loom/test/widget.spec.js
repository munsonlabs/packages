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
        {
          id: 'shop',
          label: 'Shop',
          fields: { addToCart: { type: 'action' } },
          setup: ({ data, context }) => ({ addToCart: () => context.cart.add(data.value) }),
        },
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

  it('only counts the built-ins themselves as built-in, not names every object has', () => {
    const Any = defineComponent({ render: () => null })
    const kit = createKit({ blocks: [{ type: 'toString', label: 'T', description: '', container: false, props: {}, component: Any }] })
    expect(Object.keys(kit.blocks)).toContain('toString')
  })

  it('renders a kit block whose name every object has, and finds nothing for one it lacks', () => {
    const Shout = defineComponent({ props: { text: { type: String, default: '' } }, setup: (p) => () => h('strong', p.text) })
    const block = {
      type: 'toString',
      label: 'T',
      description: '',
      container: false,
      props: { text: { type: 'string', label: 'Text', default: 'hi' } },
      component: Shout,
    }
    const root = {
      id: 'r',
      type: 'Stack',
      children: [
        { id: 's', type: 'toString' },
        { id: 'v', type: 'valueOf' },
      ],
    }
    const wrapper = mount(Widget, { props: { kit: createKit({ blocks: [block] }), definition: { version: 2, id: 'w', name: 'W', root }, data: {} } })
    expect(wrapper.find('[data-node-id="s"]').text()).toBe('hi')
    expect(wrapper.find('[data-node-id="v"]').exists()).toBe(false)
    expect(createKit().sources.toString).toBeUndefined()
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

describe('Widget blocks', () => {
  const mini = {
    version: 2,
    id: 'mini',
    name: 'Mini',
    match: [{ path: 'kind', op: 'equals', value: 'product' }],
    root: { id: 'title', type: 'Text', bind: { text: 'product.title' } },
  }
  const price = { ...mini, id: 'price', name: 'Price', root: { id: 'price', type: 'Text', bind: { text: 'product.price' } } }
  const shelf = (block = {}) => ({
    version: 2,
    id: 'shelf',
    name: 'Shelf',
    root: {
      id: 'list',
      type: 'Repeat',
      bind: { items: 'product.related' },
      children: [{ id: 'each', type: 'Widget', bind: { data: 'item' }, ...block }],
    },
  })
  const mountShelf = (props) => mount(Widget, { props: { kit: makeKit(), data: makeProducts()[0], context: makeShop(), ...props } })

  it('draw the widget the bound data matches, with its own sources, marked as nested', () => {
    const wrapper = mountShelf({ definition: shelf(), definitions: [mini] })
    expect(wrapper.findAll('[data-widget="mini"]').map((w) => w.text())).toEqual(['Matching mug', 'Spare lid'])
    expect(wrapper.findAll('[data-node-id="each"]')).toHaveLength(2)
    expect(wrapper.find('[data-node-id="title"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-nested-node-id="title"]')).toHaveLength(2)
  })

  it('draw the widget they name instead, when they name one', () => {
    const wrapper = mountShelf({ definition: shelf({ props: { widget: 'price' } }), definitions: [mini, price] })
    expect(wrapper.findAll('[data-widget="price"]').map((w) => w.text())).toEqual(['£8', '£3'])
  })

  it('never draw a widget inside itself', () => {
    // The shelf takes any data, so each related product would get the shelf again.
    const wrapper = mountShelf({ definitions: [shelf()] })
    expect(wrapper.attributes('data-widget')).toBe('shelf')
    expect(wrapper.findAll('[data-widget]')).toHaveLength(1)
  })

  it('draw nothing without a library to pick from', () => {
    expect(mountShelf({ definition: shelf() }).find('.w-widget').exists()).toBe(false)
  })

  it('only take an object as their data', () => {
    const issues = validateDefinition(makeKit(), shelf({ bind: { data: 'item.title' } }))
    expect(issues.map((i) => i.message)).toEqual(['Widget.data can\'t take a string ("item.title")'])
  })
})
