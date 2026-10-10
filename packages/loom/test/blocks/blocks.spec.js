import { afterEach, describe, expect, it } from 'vite-plus/test'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import Widget from '@/Widget.vue'
import { createKit } from '@/kit'
import { makeProducts, makeShop, productSource } from '@test/fixtures'

enableAutoUnmount(afterEach)

const kit = createKit({ sources: [productSource] })
const definition = (root) => ({ version: 2, id: 'b', name: 'B', root })

describe('content blocks', () => {
  it('render nothing for a bound value that is missing, never the prop’s default', () => {
    // The kettle has no summary and no image.
    const def = definition({
      id: 'r',
      type: 'Stack',
      children: [
        { id: 'missing', type: 'Text', bind: { text: 'product.summary' } },
        { id: 'empty', type: 'Image', bind: { src: 'product.image' } },
      ],
    })
    const wrapper = mount(Widget, { props: { kit, definition: def, data: makeProducts()[1], context: makeShop() } })
    expect(wrapper.find('[data-node-id="missing"]').exists()).toBe(false)
    expect(wrapper.find('[data-node-id="empty"]').exists()).toBe(false)
  })
})
