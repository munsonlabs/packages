import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import Widget from '@/Widget.vue'
import { createKit, provideKit } from '@/kit'
import { makeKit, makeProducts, makeShop, productCard, productSource } from '@test/fixtures'

enableAutoUnmount(afterEach)

function render(props = {}, productIndex = 0) {
  const products = makeProducts()
  const shop = makeShop()
  const kit = makeKit()
  const wrapper = mount(Widget, {
    props: { kit, definition: productCard, data: products[productIndex], index: 4, context: shop, ...props },
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

  it('reaches sources added to the definition after mount', async () => {
    const { wrapper } = render({
      definition: { ...productCard, root: { id: 't', type: 'Text', bind: { text: 'product.category' } } },
    })
    expect(wrapper.find('[data-node-id="t"]').text()).toBe('Kitchen')
    await wrapper.setProps({ definition: { ...productCard, root: { id: 't', type: 'Text', bind: { text: 'product.price' } } } })
    expect(wrapper.find('[data-node-id="t"]').text()).toBe('£24')
  })

  it('sets each source up once, however many bindings reach it', () => {
    const setup = vi.fn(productSource.setup)
    const kit = createKit({ sources: [{ ...productSource, setup }] })
    mount(Widget, { props: { kit, definition: productCard, data: makeProducts()[0], context: makeShop() } })
    expect(setup).toHaveBeenCalledTimes(1)
  })

  it('takes the kit and context from provideKit()', () => {
    const kit = makeKit()
    const shop = makeShop()
    const product = makeProducts()[0]
    const Host = defineComponent({
      setup() {
        provideKit(kit, shop)
        return () => h(Widget, { definition: productCard, data: product })
      },
    })
    expect(mount(Host).find('[data-node-id="title"]').text()).toBe('Teapot')
  })
})

describe('createKit', () => {
  it('refuses duplicate names', () => {
    expect(() => createKit({ sources: [productSource, productSource] })).toThrow('share the id')
  })
})
