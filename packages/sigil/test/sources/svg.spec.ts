import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { svgLibrary } from '@/sources/svg'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path d="m"/></svg>'
const req = (name: string, variant?: string) => ({ name, variant })

afterEach(() => vi.unstubAllGlobals())

describe('svgLibrary with an icons map', () => {
  const FILLED = '<svg xmlns="http://www.w3.org/2000/svg"><path d="filled"/></svg>'

  it('serves strings and variant maps, falling back to default', async () => {
    const lib = svgLibrary({ icons: { heart: SVG, bell: { default: SVG, active: FILLED } } })
    expect(await lib.resolve!(req('heart'))).toMatchObject({ html: SVG })
    expect(await lib.resolve!(req('bell', 'active'))).toMatchObject({ html: FILLED })
    expect(await lib.resolve!(req('bell', 'nope'))).toMatchObject({ html: SVG })
    await expect(lib.resolve!(req('missing'))).rejects.toThrow(/not in this library/)
  })

  it('accepts a promise of a map', async () => {
    const lib = svgLibrary({ icons: Promise.resolve({ heart: SVG }) })
    expect(await lib.resolve!(req('heart'))).toMatchObject({ html: SVG })
  })

  it('rejects a variant map with no default when the variant is missing', async () => {
    const lib = svgLibrary({ icons: { bell: { active: FILLED } } })
    await expect(lib.resolve!(req('bell'))).rejects.toThrow(/no "default" variant/)
  })

  it('requires a resolver or icons', () => {
    expect(() => svgLibrary({})).toThrow(/resolver or an icons map/)
  })
})

describe('svgLibrary', () => {
  it('resolves markup into an icon-svg span and caches it for resolveSync', async () => {
    const resolver = vi.fn(() => SVG)
    const lib = svgLibrary({ resolver })
    expect(lib.resolveSync!(req('heart'))).toBeUndefined()
    expect(await lib.resolve!(req('heart'))).toEqual({ tag: 'span', className: 'icon-svg', html: SVG })
    expect(lib.resolveSync!(req('heart'))).toEqual({ tag: 'span', className: 'icon-svg', html: SVG })
    await lib.resolve!(req('heart'))
    expect(resolver).toHaveBeenCalledTimes(1)
  })

  it('passes name and variant to the resolver and caches per combination', async () => {
    const resolver = vi.fn(() => SVG)
    const lib = svgLibrary({ resolver })
    await lib.resolve!(req('heart', 'active'))
    await lib.resolve!(req('heart'))
    expect(resolver).toHaveBeenCalledWith('heart', 'active')
    expect(resolver).toHaveBeenCalledTimes(2)
  })

  it('deduplicates concurrent resolutions', async () => {
    let release!: (v: string) => void
    const resolver = vi.fn(() => new Promise<string>((r) => (release = r)))
    const lib = svgLibrary({ resolver })
    const both = Promise.all([lib.resolve!(req('heart')), lib.resolve!(req('heart'))])
    release(SVG)
    const [a, b] = await both
    expect(a).toEqual(b)
    expect(resolver).toHaveBeenCalledTimes(1)
  })

  it('does not cache failures', async () => {
    const resolver = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(SVG)
    const lib = svgLibrary({ resolver })
    await expect(lib.resolve!(req('heart'))).rejects.toThrow('offline')
    expect(await lib.resolve!(req('heart'))).toBeDefined()
    expect(resolver).toHaveBeenCalledTimes(2)
  })

  it('fetches when the resolver returns a URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(SVG) })
    vi.stubGlobal('fetch', fetchMock)
    const lib = svgLibrary({ resolver: (name) => `https://cdn.test/${name}.svg` })
    expect(await lib.resolve!(req('heart'))).toMatchObject({ html: SVG })
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.test/heart.svg')
  })

  it('rejects a non-OK fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    const lib = svgLibrary({ resolver: () => '/nope.svg' })
    await expect(lib.resolve!(req('heart'))).rejects.toThrow(/404/)
  })

  it('unwraps a module namespace with a default export', async () => {
    const lib = svgLibrary({ resolver: async () => ({ default: SVG }) })
    expect(await lib.resolve!(req('heart'))).toMatchObject({ html: SVG })
  })

  it('rejects markup that is not an svg document', async () => {
    const lib = svgLibrary({ resolver: () => '<html><body>404</body></html>' })
    await expect(lib.resolve!(req('heart'))).rejects.toThrow(/<svg>/)
  })

  it('applies the mutator to the parsed svg', async () => {
    const lib = svgLibrary({ resolver: () => SVG, mutator: (svg) => svg.setAttribute('fill', 'currentColor') })
    expect((await lib.resolve!(req('heart')))!.html).toContain('fill="currentColor"')
  })

  it('dispose drops the cache', async () => {
    const resolver = vi.fn(() => SVG)
    const lib = svgLibrary({ resolver })
    await lib.resolve!(req('heart'))
    lib.dispose!()
    expect(lib.resolveSync!(req('heart'))).toBeUndefined()
    await lib.resolve!(req('heart'))
    expect(resolver).toHaveBeenCalledTimes(2)
  })
})

describe('svgLibrary without a DOM', () => {
  it('root-checks markup, skips the mutator and caches nothing', async () => {
    vi.stubGlobal('DOMParser', undefined)
    const resolver = vi.fn(() => SVG)
    const mutator = vi.fn()
    const lib = svgLibrary({ resolver, mutator })

    expect(await lib.resolve!(req('heart'))).toEqual({ tag: 'span', className: 'icon-svg', html: SVG })
    expect(mutator).not.toHaveBeenCalled()
    expect(lib.resolveSync).toBeUndefined()

    await lib.resolve!(req('heart'))
    expect(resolver).toHaveBeenCalledTimes(2)
  })

  it('still rejects markup whose root is not <svg>', async () => {
    vi.stubGlobal('DOMParser', undefined)
    const lib = svgLibrary({ resolver: () => '<html><body>404</body></html>' })
    await expect(lib.resolve!(req('heart'))).rejects.toThrow(/<svg>/)
  })
})
