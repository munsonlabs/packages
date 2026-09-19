import { describe, expect, it, vi } from 'vite-plus/test'
import { cached } from '@/sources/cached'
import type { IconSource, ResolvedIcon } from '@/types'

const icon = (text: string): ResolvedIcon => ({ tag: 'span', text })
const req = (name: string, variant?: string) => ({ name, variant })

describe('cached', () => {
  it('serves a resolved icon synchronously from then on, per name and variant', async () => {
    const resolve = vi.fn(async ({ name, variant }) => icon(`${name}:${variant ?? ''}`))
    const lib = cached({ resolve })

    expect(lib.resolveSync!(req('heart'))).toBeUndefined()
    expect(await lib.resolve!(req('heart'))).toEqual(icon('heart:'))
    expect(lib.resolveSync!(req('heart'))).toEqual(icon('heart:'))
    expect(await lib.resolve!(req('heart', 'active'))).toEqual(icon('heart:active'))
    expect(resolve).toHaveBeenCalledTimes(2)
  })

  it('keeps hyphenated names and variants apart', async () => {
    const lib = cached({ resolve: async ({ name, variant }) => icon(`${name}|${variant ?? ''}`) })
    expect(await lib.resolve!(req('bell-ring', 'active'))).toEqual(icon('bell-ring|active'))
    expect(await lib.resolve!(req('bell', 'ring-active'))).toEqual(icon('bell|ring-active'))
  })

  it('shares one resolution between concurrent requests', async () => {
    const resolve = vi.fn(() => new Promise<ResolvedIcon>((done) => setTimeout(() => done(icon('x')), 5)))
    const lib = cached({ resolve })
    const [a, b] = await Promise.all([lib.resolve!(req('x')), lib.resolve!(req('x'))])
    expect(a).toBe(b)
    expect(resolve).toHaveBeenCalledTimes(1)
  })

  it('remembers neither failures nor "not mine"', async () => {
    let attempt = 0
    const lib = cached({
      resolve: async ({ name }) => {
        attempt++
        if (name === 'boom') throw new Error('boom')
        return undefined
      },
    })
    await expect(lib.resolve!(req('boom'))).rejects.toThrow('boom')
    await expect(lib.resolve!(req('boom'))).rejects.toThrow('boom')
    expect(await lib.resolve!(req('nope'))).toBeUndefined()
    expect(await lib.resolve!(req('nope'))).toBeUndefined()
    expect(attempt).toBe(4)
  })

  it('prefers the inner resolveSync and passes dispose through', async () => {
    const inner: IconSource = {
      resolveSync: ({ name }) => (name === 'fast' ? icon('fast') : undefined),
      resolve: async () => icon('slow'),
      dispose: vi.fn(),
    }
    const lib = cached(inner)
    expect(lib.resolveSync!(req('fast'))).toEqual(icon('fast'))
    expect(await lib.resolve!(req('fast'))).toEqual(icon('fast'))
    expect(await lib.resolve!(req('other'))).toEqual(icon('slow'))
    lib.dispose!()
    expect(inner.dispose).toHaveBeenCalledOnce()
    expect(lib.resolveSync!(req('other'))).toBeUndefined()
  })
})
