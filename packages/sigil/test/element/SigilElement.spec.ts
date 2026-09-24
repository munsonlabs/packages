import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { register, override, clear } from '@/registry'
import { defineElements, SigilElement } from '@/element/SigilElement'
import { createIconNode } from '@/element/render'
import { svgLibrary } from '@/sources/svg'
import { fontLibrary } from '@/sources/font'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path d="m"/></svg>'
const svgWith = (d: string) => `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`
const tick = () => new Promise((r) => setTimeout(r, 0))

defineElements()

function mountIcon(attrs: Record<string, string>): SigilElement {
  const el = document.createElement('ml-sigil-icon') as SigilElement
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

beforeEach(() => clear())
afterEach(() => document.body.replaceChildren())

describe('createIconNode', () => {
  it('renders html, text and bare descriptions', () => {
    const svg = createIconNode({ tag: 'span', className: 'icon-svg', html: SVG })
    expect(svg.tagName).toBe('SPAN')
    expect(svg.className).toBe('icon-svg')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.querySelector('svg')).not.toBeNull()

    const font = createIconNode({ tag: 'i', className: 'fa fa-heart', text: '\ue001' })
    expect(font.tagName).toBe('I')
    expect(font.className).toBe('fa fa-heart')
    expect(font.textContent).toBe('\ue001')

    const bare = createIconNode({ tag: 'i' })
    expect(bare.className).toBe('')
    expect(bare.textContent).toBe('')
  })
})

describe('<ml-sigil-icon>', () => {
  it('defines idempotently', () => {
    expect(customElements.get('ml-sigil-icon')).toBe(SigilElement)
    expect(() => defineElements()).not.toThrow()
  })

  it('renders an override synchronously and a font entry as <i>', () => {
    override('heart', SVG)
    void register('fa', fontLibrary({ className: 'fa', mapping: { star: 'fa-star' } }))
    expect(mountIcon({ name: 'heart' }).querySelector('span.icon-svg svg')).not.toBeNull()
    expect(mountIcon({ name: 'star', library: 'fa' }).querySelector('i')!.className).toBe('fa fa-star')
  })

  it('resolves an SVG library asynchronously and keeps previous content until it lands', async () => {
    let release!: (v: string) => void
    void register('svg', svgLibrary({ resolver: () => new Promise<string>((r) => (release = r)) }))
    const el = mountIcon({ name: 'heart', library: 'svg' })
    expect(el.childNodes).toHaveLength(0)
    release(SVG)
    await tick()
    expect(el.querySelector('svg')).not.toBeNull()
  })

  it('empties itself when nothing resolves', async () => {
    override('heart', SVG)
    const el = mountIcon({ name: 'heart' })
    expect(el.childNodes).toHaveLength(1)
    el.name = 'missing'
    await tick()
    expect(el.childNodes).toHaveLength(0)
  })

  it('reacts to attribute changes and property setters', () => {
    void register('si', fontLibrary({ className: 'si', mapping: (n, v) => (v === 'active' ? `${n}-filled` : `${n}-outline`) }))
    const el = mountIcon({ name: 'save', library: 'si' })
    expect(el.querySelector('i')!.className).toBe('si save-outline')
    el.variant = 'active'
    expect(el.querySelector('i')!.className).toBe('si save-filled')
    el.variant = undefined
    expect(el.hasAttribute('variant')).toBe(false)
    expect(el.querySelector('i')!.className).toBe('si save-outline')
  })

  it('picks up registrations made after it is connected', async () => {
    const el = mountIcon({ name: 'heart' })
    await tick()
    expect(el.childNodes).toHaveLength(0)

    void register('svg', svgLibrary({ resolver: () => SVG }))
    await tick()
    expect(el.querySelector('svg')).not.toBeNull()

    override('heart', svgWith('override'))
    expect(el.querySelector('path')!.getAttribute('d')).toBe('override')
  })

  it('ignores a stale resolution when the name changes mid-flight', async () => {
    const gates: Record<string, (v: string) => void> = {}
    void register('svg', svgLibrary({ resolver: (name) => new Promise<string>((r) => (gates[name] = r)) }))
    const el = mountIcon({ name: 'first', library: 'svg' })
    el.name = 'second'
    await tick()
    gates.second(svgWith('second'))
    await tick()
    gates.first(svgWith('first'))
    await tick()
    expect(el.querySelector('path')!.getAttribute('d')).toBe('second')
  })

  it('re-resolves when its library is re-registered and stops listening once disconnected', async () => {
    const resolver = vi.fn(() => SVG)
    void register('svg', svgLibrary({ resolver }))
    const el = mountIcon({ name: 'heart', library: 'svg' })
    await tick()
    void register('svg', svgLibrary({ resolver }))
    await tick()
    expect(resolver).toHaveBeenCalledTimes(2)

    el.remove()
    void register('svg', svgLibrary({ resolver }))
    await tick()
    expect(resolver).toHaveBeenCalledTimes(2)
  })

  it('drops a resolution that lands after it was disconnected', async () => {
    let release!: (v: string) => void
    void register('svg', svgLibrary({ resolver: () => new Promise<string>((r) => (release = r)) }))
    const el = mountIcon({ name: 'heart', library: 'svg' })
    await tick()
    el.remove()
    release(SVG)
    await tick()
    expect(el.childElementCount).toBe(0)
  })
})
