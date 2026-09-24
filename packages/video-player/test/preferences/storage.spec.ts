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
    writeStorage('ml-video-test', 'value')
    expect(readStorage('ml-video-test')).toBe('value')
  })

  it('returns null instead of throwing when reads are blocked', () => {
    breakStorage()
    expect(readStorage('ml-video-test')).toBeNull()
  })

  it('swallows a failed write', () => {
    breakStorage()
    expect(() => writeStorage('ml-video-test', 'value')).not.toThrow()
  })
})
