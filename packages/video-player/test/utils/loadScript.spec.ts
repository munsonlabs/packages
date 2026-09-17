import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { loadScript } from '@/utils/loadScript'

// jsdom refuses external scripts and fires `error` on append, so capture the tags instead of
// really inserting them and drive onload/onerror by hand.
let appended: HTMLScriptElement[] = []

beforeEach(() => {
  appended = []
  vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
    appended.push(node as HTMLScriptElement)
    return node
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadScript', () => {
  it('dedupes concurrent loads of the same key onto one script tag', async () => {
    const a = loadScript('https://example.com/dedupe.js')
    const b = loadScript('https://example.com/dedupe.js')
    expect(a).toBe(b)
    expect(appended).toHaveLength(1)
    expect(appended[0].src).toBe('https://example.com/dedupe.js')

    appended[0].onload?.(new Event('load'))
    await expect(a).resolves.toBeUndefined()
  })

  it('rejects on a load error, removes the tag, and lets the next call try again', async () => {
    const first = loadScript('https://example.com/flaky.js')
    const removeSpy = vi.spyOn(appended[0], 'remove')
    appended[0].onerror?.(new Event('error'))
    await expect(first).rejects.toThrow('Failed to load script: https://example.com/flaky.js')
    expect(removeSpy).toHaveBeenCalledOnce()

    const second = loadScript('https://example.com/flaky.js')
    expect(second).not.toBe(first)
    expect(appended).toHaveLength(2)
    appended[1].onload?.(new Event('load'))
    await expect(second).resolves.toBeUndefined()
  })
})
