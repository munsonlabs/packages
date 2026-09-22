import { describe, it, expect, vi, afterEach } from 'vite-plus/test'
import { readStorage, writeStorage } from '@/preferences/storage'

function breakStorage(): void {
  vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
    throw new DOMException('denied', 'SecurityError')
  })
  vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
    throw new DOMException('quota', 'QuotaExceededError')
  })
}

afterEach(() => vi.restoreAllMocks())

describe('storage', () => {
  it('round-trips when storage works', () => {
    writeStorage('mlv-test', 'value')
    expect(readStorage('mlv-test')).toBe('value')
  })

  it('returns null instead of throwing when reads are blocked', () => {
    breakStorage()
    expect(readStorage('mlv-test')).toBeNull()
  })

  it('swallows a failed write', () => {
    breakStorage()
    expect(() => writeStorage('mlv-test', 'value')).not.toThrow()
  })
})
