import { afterEach, describe, expect, it } from 'vite-plus/test'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import Widget from '@/Widget.vue'
import { createKit } from '@/kit'
import { validateDefinition } from '@/definitions/validate'
import { makeProducts, makeShop, productSource } from '@test/fixtures'

enableAutoUnmount(afterEach)

const kit = createKit({ sources: [productSource] })
const definition = (root) => ({ version: 2, id: 'b', name: 'B', root })

function render(root) {
  const def = definition(root)
  expect(validateDefinition(kit, def)).toEqual([])
  return mount(Widget, { props: { kit, definition: def, data: makeProducts()[0], context: makeShop() } })
}

const el = (wrapper, id) => wrapper.find(`[data-node-id="${id}"]`).element

describe('layout blocks', () => {
  it('Box is a surface with token defaults', () => {
    const box = el(
      render({
        id: 'box',
        type: 'Box',
        props: { border: true, shadow: 'var(--w-shadow-md)' },
        children: [{ id: 't', type: 'Text', props: { text: 'Hi' } }],
      }),
      'box',
    )
    expect(box.classList).toContain('w-box')
    expect(box.style.background).toBe('var(--w-surface)')
    expect(box.style.padding).toBe('var(--w-space-3)')
    expect(box.style.borderRadius).toBe('var(--w-radius-md)')
    expect(box.style.boxShadow).toBe('var(--w-shadow-md)')
    expect(box.style.borderColor).toBe('var(--w-border)')
  })

  it('Grid uses fixed columns, or as many as fit a minimum width', () => {
    expect(el(render({ id: 'g', type: 'Grid', props: { columns: 3 } }), 'g').style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))')
    expect(el(render({ id: 'g', type: 'Grid', props: { minWidth: '140px' } }), 'g').style.gridTemplateColumns).toBe(
      'repeat(auto-fill, minmax(min(140px, 100%), 1fr))',
    )
  })

  it('Carousel sets its slide width and snaps', () => {
    const carousel = el(render({ id: 'c', type: 'Carousel', props: { itemWidth: '60%' } }), 'c')
    expect(carousel.style.getPropertyValue('--loom-item-width')).toBe('60%')
    expect(carousel.classList).toContain('is-snapping')
  })

  it('Repeat lays its items out as a stack, a grid or a carousel', () => {
    const repeat = (layout) =>
      el(
        render({
          id: 'r',
          type: 'Repeat',
          props: { layout, columns: 2 },
          bind: { items: 'product.related' },
          children: [{ id: 'n', type: 'Text', bind: { text: 'item.title' } }],
        }),
        'r',
      )
    expect(repeat('stack').classList).toContain('is-stack')
    expect(repeat('grid').style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
    expect(repeat('carousel').classList).toContain('is-snapping')
  })
})

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
    expect(validateDefinition(kit, def)).toEqual([])
    const wrapper = mount(Widget, { props: { kit, definition: def, data: makeProducts()[1], context: makeShop() } })
    expect(wrapper.find('[data-node-id="missing"]').exists()).toBe(false)
    expect(wrapper.find('[data-node-id="empty"]').exists()).toBe(false)
  })

  it('Avatar shows a picture, else initials, else nothing', () => {
    expect(
      render({ id: 'a', type: 'Avatar', props: { src: '/me.jpg', name: 'Ada Lovell' } })
        .find('[data-node-id="a"] img')
        .attributes('src'),
    ).toBe('/me.jpg')
    const initials = render({ id: 'a', type: 'Avatar', props: { name: 'ada byron lovell', size: 'lg' } })
    expect(initials.find('[data-node-id="a"]').text()).toBe('AB')
    expect(el(initials, 'a').classList).toContain('is-lg')
    expect(render({ id: 'a', type: 'Avatar' }).find('[data-node-id="a"]').exists()).toBe(false)
  })

  it('Rating fills stars to the value, partly for fractions', () => {
    const wrapper = render({ id: 'r', type: 'Rating', props: { value: 3.5, showValue: true } })
    const fills = wrapper.findAll('.w-rating-star').map((star) => star.element.style.getPropertyValue('--loom-fill'))
    expect(fills).toEqual(['100%', '100%', '100%', '50%', '0%'])
    expect(el(wrapper, 'r').getAttribute('aria-label')).toBe('3.5 out of 5')
    expect(wrapper.find('.w-rating-value').text()).toBe('3.5')
  })

  it('Progress fills to the value out of its maximum, clamped', () => {
    const bar = (value) =>
      render({ id: 'p', type: 'Progress', props: { value, max: 40, tone: 'alert', label: 'Stock' } }).find('.w-progress-bar').element.style.width
    expect(bar(10)).toBe('25%')
    expect(bar(99)).toBe('100%')
    const wrapper = render({ id: 'p', type: 'Progress', props: { value: 10, max: 40, tone: 'alert', label: 'Stock' } })
    expect(el(wrapper, 'p').classList).toContain('is-alert')
    expect(wrapper.find('.w-progress-label').text()).toBe('Stock')
  })
})
