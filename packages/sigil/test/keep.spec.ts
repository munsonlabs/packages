import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { createSigil } from '@/registry'
import type { Sigil } from '@/registry'
import type { IconSource } from '@/types'
import { keepLibrary } from '@/keep'

/** A ready source `register()` stores directly, with no async load step to await in a test. */
function source(tag: string): IconSource {
  return { resolveSync: ({ name }) => ({ tag: 'i', text: `${tag}:${name}` }) }
}

describe('keepLibrary', () => {
  let registry: Sigil
  beforeEach(() => {
    registry = createSigil()
  })

  it('registers the library immediately', () => {
    keepLibrary('mlv', source('mlv'), registry)
    expect(registry.libraries).toEqual(['mlv'])
    expect(registry.getIconSync('play', { library: 'mlv' })).toEqual({ tag: 'i', text: 'mlv:play' })
  })

  it('puts it back after the host unregisters it', () => {
    keepLibrary('mlv', source('mlv'), registry)
    registry.unregister('mlv')
    expect(registry.libraries).toEqual(['mlv'])
    expect(registry.getIconSync('play', { library: 'mlv' })).toEqual({ tag: 'i', text: 'mlv:play' })
  })

  it('does not fight a host that replaces it under the same name', () => {
    keepLibrary('mlv', source('mlv'), registry)
    void registry.register('mlv', source('host'))
    expect(registry.getIconSync('play', { library: 'mlv' })).toEqual({ tag: 'i', text: 'host:play' })
  })

  it('leaves an unrelated change alone', () => {
    keepLibrary('mlv', source('mlv'), registry)
    void registry.register('other', source('other'))
    expect(registry.getIconSync('play', { library: 'mlv' })).toEqual({ tag: 'i', text: 'mlv:play' })
  })

  it('stops restoring it once told to stop', () => {
    const stop = keepLibrary('mlv', source('mlv'), registry)
    stop()
    registry.unregister('mlv')
    expect(registry.libraries).toEqual([])
  })
})
