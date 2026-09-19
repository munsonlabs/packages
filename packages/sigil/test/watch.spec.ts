import { describe, expect, it, vi } from 'vite-plus/test'
import { createSigil } from '@/registry'
import { watchIcon } from '@/watch'
import type { ResolvedIcon } from '@/types'

const icon = (text: string): ResolvedIcon => ({ tag: 'span', text })
const tick = () => new Promise((done) => setTimeout(done, 0))

describe('watchIcon', () => {
  it('reports a synchronous hit immediately', () => {
    const registry = createSigil()
    registry.override('heart', '<svg/>')
    const onIcon = vi.fn()
    watchIcon('heart', {}, onIcon, registry)
    expect(onIcon).toHaveBeenCalledOnce()
    expect(onIcon.mock.calls[0]![0]).toMatchObject({ html: '<svg/>' })
  })

  it('stays quiet on a synchronous miss until the asynchronous answer lands', async () => {
    const registry = createSigil()
    void registry.register('slow', { resolve: async ({ name }) => icon(name) })
    const onIcon = vi.fn()
    watchIcon('heart', {}, onIcon, registry)
    expect(onIcon).not.toHaveBeenCalled()
    await tick()
    expect(onIcon).toHaveBeenCalledWith(icon('heart'))
  })

  it('re-resolves when the registry changes and stops after stop()', async () => {
    const registry = createSigil()
    const onIcon = vi.fn()
    const stop = watchIcon('heart', {}, onIcon, registry)
    await tick()
    expect(onIcon).toHaveBeenCalledWith(undefined)

    registry.override('heart', '<svg/>')
    expect(onIcon).toHaveBeenLastCalledWith(expect.objectContaining({ html: '<svg/>' }))

    stop()
    registry.override('heart', '<svg id="later"/>')
    expect(onIcon).toHaveBeenCalledTimes(2)
  })

  it('drops an asynchronous result that arrives after stop()', async () => {
    const registry = createSigil()
    let release!: (value: ResolvedIcon) => void
    void registry.register('gated', { resolve: () => new Promise((done) => (release = done)) })
    const onIcon = vi.fn()
    const stop = watchIcon('heart', {}, onIcon, registry)
    await tick()
    stop()
    release(icon('late'))
    await tick()
    expect(onIcon).not.toHaveBeenCalled()
  })
})
