import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { sigil, register, unregister, override, use, getIcon, getIconSync, subscribe, clear } from '@/registry'
import type { IconSource, ResolvedIcon } from '@/types'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path d="m"/></svg>'
const icon = (tag: string, text: string): ResolvedIcon => ({ tag, text })

/** A source that answers only the given names, sync or async. */
function source(names: string[], mode: 'sync' | 'async' = 'sync'): IconSource & { calls: string[]; disposed: boolean } {
  const s = {
    calls: [] as string[],
    disposed: false,
    resolveSync:
      mode === 'sync' ? ({ name }: { name: string }) => (s.calls.push(name), names.includes(name) ? icon('i', name) : undefined) : undefined,
    resolve:
      mode === 'async'
        ? async ({ name }: { name: string }) => (s.calls.push(name), names.includes(name) ? icon('span', name) : undefined)
        : undefined,
    dispose: () => (s.disposed = true),
  }
  return s as IconSource & { calls: string[]; disposed: boolean }
}

beforeEach(() => clear())

describe('shared instance', () => {
  it('is parked on globalThis so duplicate copies of the module share it', () => {
    expect((globalThis as Record<symbol, unknown>)[Symbol.for('@munsonlabs/sigil')]).toBe(sigil)
  })

  it('reports its package version', () => {
    expect(sigil.version).toMatch(/^\d+\.\d+\.\d+/)
  })
})

describe('overrides', () => {
  it('registers markup and factories, singly or as a record', () => {
    override('markup', SVG)
    override({
      factory: ({ name, variant, library }) => `<svg data-name="${name}" data-variant="${variant}" data-library="${library}"/>`,
    })

    expect(getIconSync('markup')).toEqual({ tag: 'span', className: 'icon-svg', html: SVG })
    expect(getIconSync('factory', { variant: 'active', library: 'x' })).toEqual({
      tag: 'span',
      className: 'icon-svg',
      html: '<svg data-name="factory" data-variant="active" data-library="x"/>',
    })
    expect(getIconSync('nope')).toBeUndefined()
  })

  it('wins over every library, including the default', async () => {
    const lib = source(['heart'])
    void register('lib', lib)
    use('lib')
    override('heart', SVG)
    expect(await getIcon('heart')).toMatchObject({ html: SVG })
    expect(lib.calls).toEqual([])
  })
})

describe('libraries', () => {
  it('lists, replaces (disposing the old source) and unregisters', () => {
    const a = source([])
    const b = source([])
    void register('x', a)
    void register('y', source([]))
    expect(sigil.libraries).toEqual(['x', 'y'])

    void register('x', b)
    expect(a.disposed).toBe(true)
    expect(sigil.libraries).toEqual(['x', 'y'])

    use('x')
    unregister('x')
    expect(b.disposed).toBe(true)
    expect(sigil.libraries).toEqual(['y'])
    expect(sigil.defaultLibrary).toBeNull()
  })

  it('notifies subscribers on every mutation and stops after unsubscribe', () => {
    const listener = vi.fn()
    const stop = subscribe(listener)
    override('a', SVG)
    void register('x', source([]))
    use('x')
    unregister('x')
    clear()
    expect(listener).toHaveBeenCalledTimes(5)
    stop()
    override('b', SVG)
    expect(listener).toHaveBeenCalledTimes(5)
  })

  it('clear disposes every source', () => {
    const a = source([])
    void register('a', a)
    clear()
    expect(a.disposed).toBe(true)
    expect(sigil.libraries).toEqual([])
  })
})

describe('register with a config', () => {
  const SVG_DOC = '<svg xmlns="http://www.w3.org/2000/svg"><path d="m"/></svg>'

  it('stores a placeholder synchronously and swaps in the real source once loaded', async () => {
    const listener = vi.fn()
    subscribe(listener)
    const ready = register('fa', { className: 'fa', mapping: { heart: 'fa-heart' } })
    expect(sigil.libraries).toEqual(['fa'])
    expect(getIconSync('heart', { library: 'fa' })).toBeUndefined()
    expect(listener).toHaveBeenCalledTimes(1)

    await ready
    expect(getIconSync('heart', { library: 'fa' })).toEqual({ tag: 'i', className: 'fa fa-heart', text: undefined })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('getIcon waits for the load instead of missing', async () => {
    void register('svg', { resolver: () => SVG_DOC })
    expect(await getIcon('heart', { library: 'svg' })).toMatchObject({ tag: 'span', html: SVG_DOC })
  })

  it('picks the kind from the shape', async () => {
    await register('m', { icons: { star: SVG_DOC } })
    expect(await getIcon('star', { library: 'm' })).toMatchObject({ html: SVG_DOC })
    await register('g', { className: 'g', glyphs: { star: 'e001' } })
    expect(getIconSync('star', { library: 'g' })).toMatchObject({ className: 'g', text: '\ue001' })
  })

  it('stores a ready source directly with no async step', () => {
    void register('s', source(['heart']))
    expect(getIconSync('heart', { library: 's' })).toEqual(icon('i', 'heart'))
  })

  it('rejects an unrecognised shape and leaves a source that answers nothing', async () => {
    const ready = register('bad', {} as never)
    await expect(ready).rejects.toThrow(/Unrecognised/)
    expect(await getIcon('x', { library: 'bad' })).toBeUndefined()
  })

  it('does not notify or keep a source that was unregistered before it loaded', async () => {
    const ready = register('fa', { className: 'fa' })
    const listener = vi.fn()
    subscribe(listener)
    unregister('fa')
    await ready
    expect(listener).toHaveBeenCalledTimes(1)
    expect(sigil.libraries).toEqual([])
  })

  it('clears the default when the library it points at fails to load', async () => {
    const ready = register('bad', {} as never, { default: true })
    expect(sigil.defaultLibrary).toBe('bad')
    await expect(ready).rejects.toThrow(/Unrecognised/)
    expect(sigil.defaultLibrary).toBeNull()
  })

  it('warns in development when a source rejects, and still resolves to undefined', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    void register('boom', { resolve: async () => Promise.reject(new Error('nope')) })
    expect(await getIcon('heart', { library: 'boom' })).toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"heart"'), expect.any(Error))
    warn.mockRestore()
  })
})

describe('use and the default option', () => {
  it('use sets and clears the default library and notifies', () => {
    const listener = vi.fn()
    subscribe(listener)
    void register('a', source(['heart']))
    use('a')
    expect(sigil.defaultLibrary).toBe('a')
    expect(getIconSync('heart')).toEqual(icon('i', 'heart'))
    use(null)
    expect(sigil.defaultLibrary).toBeNull()
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('register(name, config, { default: true }) makes it the default in one call', async () => {
    void register('other', source([]))
    await register('fa', { className: 'fa' }, { default: true })
    expect(sigil.defaultLibrary).toBe('fa')
    expect(getIconSync('heart')).toMatchObject({ className: 'fa heart' })
  })
})

describe('resolution', () => {
  it('passes name and variant to the source', () => {
    const resolveSync = vi.fn(() => icon('i', 'x'))
    void register('lib', { resolveSync })
    getIconSync('heart', { library: 'lib', variant: 'active' })
    expect(resolveSync).toHaveBeenCalledWith({ name: 'heart', variant: 'active' })
  })

  it('asks the named library, else the default, else the sole library, else nothing', async () => {
    const one = source(['heart'])
    void register('one', one)
    expect(await getIcon('heart')).toEqual(icon('i', 'heart'))
    expect(one.calls).toEqual(['heart'])

    const two = source(['heart'])
    void register('two', two)
    expect(await getIcon('heart')).toBeUndefined()
    expect(one.calls).toEqual(['heart'])
    expect(two.calls).toEqual([])

    use('two')
    expect(await getIcon('heart')).toEqual(icon('i', 'heart'))
    expect(two.calls).toEqual(['heart'])

    expect(await getIcon('heart', { library: 'one' })).toEqual(icon('i', 'heart'))
    expect(one.calls).toEqual(['heart', 'heart'])
  })

  it('returns undefined for an unknown named library without asking the default', async () => {
    const one = source(['heart'])
    void register('one', one)
    use('one')
    expect(await getIcon('heart', { library: 'missing' })).toBeUndefined()
    expect(one.calls).toEqual([])
  })

  it('getIconSync never calls resolve; getIcon prefers resolveSync when both exist', async () => {
    const both = {
      calls: [] as string[],
      resolveSync: () => (both.calls.push('sync'), icon('i', 'x')),
      resolve: async () => (both.calls.push('async'), icon('span', 'x')),
    }
    void register('both', both)
    expect(getIconSync('heart')).toEqual(icon('i', 'x'))
    expect(await getIcon('heart')).toEqual(icon('i', 'x'))
    expect(both.calls).toEqual(['sync', 'sync'])
  })

  it('swallows a rejecting source', async () => {
    void register('bad', { resolve: () => Promise.reject(new Error('boom')) })
    expect(await getIcon('heart')).toBeUndefined()
  })
})
