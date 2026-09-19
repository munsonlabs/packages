import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { register, override, use, clear } from '@/registry'
import { svgLibrary } from '@/sources/svg'
import { fontLibrary } from '@/sources/font'
import { Sigil } from '@/vue'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path d="m"/></svg>'
const svgWith = (d: string) => `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`

beforeEach(() => clear())
enableAutoUnmount(afterEach)

describe('Sigil (Vue)', () => {
  it('renders a registry override, even when the default library is a font', () => {
    void register('font', fontLibrary({ className: 'f' }))
    use('font')
    override('heart', SVG)
    const wrapper = mount(Sigil, { props: { name: 'heart' } })
    expect(wrapper.find('span.icon-svg svg').exists()).toBe(true)
    expect(wrapper.find('i').exists()).toBe(false)
  })

  it('resolves an SVG library icon asynchronously', async () => {
    void register('svg', svgLibrary({ resolver: () => SVG }))
    const wrapper = mount(Sigil, { props: { name: 'heart', library: 'svg' } })
    expect(wrapper.html()).toBe('')
    await flushPromises()
    expect(wrapper.find('span.icon-svg svg').exists()).toBe(true)
  })

  it('renders a font entry as <i> with class, glyph and forwarded attrs', () => {
    void register('fa', fontLibrary({ className: 'fa', mapping: { heart: 'fa-heart' }, glyphs: { heart: 'e001' } }))
    const wrapper = mount(Sigil, { props: { name: 'heart', library: 'fa' }, attrs: { class: 'lg' } })
    const i = wrapper.find('i')
    expect(i.classes()).toEqual(['fa', 'fa-heart', 'lg'])
    expect(i.text()).toBe('')
    expect(i.attributes('aria-hidden')).toBe('true')
  })

  it('reacts to prop changes', async () => {
    void register('si', fontLibrary({ className: 'si', mapping: (n, v) => (v === 'active' ? `${n}-filled` : `${n}-outline`) }))
    const wrapper = mount(Sigil, { props: { name: 'save', library: 'si' } })
    expect(wrapper.find('i').classes()).toEqual(['si', 'save-outline'])
    await wrapper.setProps({ variant: 'active' })
    expect(wrapper.find('i').classes()).toEqual(['si', 'save-filled'])
  })

  it('renders nothing when nothing resolves', async () => {
    const wrapper = mount(Sigil, { props: { name: 'nope' } })
    await flushPromises()
    expect(wrapper.html()).toBe('')
  })

  it('picks up registrations and overrides made after mount', async () => {
    const wrapper = mount(Sigil, { props: { name: 'heart' } })
    await flushPromises()
    void register('svg', svgLibrary({ resolver: () => SVG }))
    await flushPromises()
    expect(wrapper.find('svg').exists()).toBe(true)

    override('heart', svgWith('pinned'))
    await flushPromises()
    expect(wrapper.find('path').attributes('d')).toBe('pinned')
  })

  it('ignores a stale resolution when name changes mid-flight', async () => {
    const gates: Record<string, (v: string) => void> = {}
    void register('svg', svgLibrary({ resolver: (name) => new Promise<string>((r) => (gates[name] = r)) }))
    const wrapper = mount(Sigil, { props: { name: 'first', library: 'svg' } })
    await wrapper.setProps({ name: 'second' })
    await flushPromises()
    gates.second!(svgWith('second'))
    await flushPromises()
    gates.first!(svgWith('first'))
    await flushPromises()
    expect(wrapper.find('path').attributes('d')).toBe('second')
  })

  it('re-resolves when its library is re-registered', async () => {
    const resolver = vi.fn(() => SVG)
    void register('svg', svgLibrary({ resolver }))
    mount(Sigil, { props: { name: 'heart', library: 'svg' } })
    await flushPromises()
    void register('svg', svgLibrary({ resolver }))
    await flushPromises()
    expect(resolver).toHaveBeenCalledTimes(2)
  })
})
