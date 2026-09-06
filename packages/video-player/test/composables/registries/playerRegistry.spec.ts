import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { registerPauseHandler, pauseOthers } from '@/composables/registries/playerRegistry'

// playerRegistry is a module-level Set — unregister everything between tests
const cleanups: Array<() => void> = []

beforeEach(() => {
  cleanups.forEach((fn) => fn())
  cleanups.length = 0
})

function register(fn: () => void): void {
  cleanups.push(registerPauseHandler(fn))
}

describe('registerPauseHandler', () => {
  it('returns an unregister function', () => {
    const pause = vi.fn()
    const unregister = registerPauseHandler(pause)
    expect(typeof unregister).toBe('function')
    unregister()
  })

  it('registered handler is called by pauseOthers', () => {
    const a = vi.fn()
    const b = vi.fn()
    register(a)
    register(b)
    pauseOthers(a)
    expect(b).toHaveBeenCalledOnce()
  })

  it('unregistered handler is not called by pauseOthers', () => {
    const a = vi.fn()
    const b = vi.fn()
    const unregister = registerPauseHandler(b)
    register(a)
    unregister()
    pauseOthers(a)
    expect(b).not.toHaveBeenCalled()
  })
})

describe('pauseOthers', () => {
  it('does not call the excepted handler', () => {
    const a = vi.fn()
    register(a)
    pauseOthers(a)
    expect(a).not.toHaveBeenCalled()
  })

  it('calls all handlers except the one passed', () => {
    const a = vi.fn()
    const b = vi.fn()
    const c = vi.fn()
    register(a)
    register(b)
    register(c)
    pauseOthers(a)
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledOnce()
    expect(c).toHaveBeenCalledOnce()
  })

  it('does nothing when registry is empty', () => {
    expect(() => pauseOthers(vi.fn())).not.toThrow()
  })

  it('does not let a throwing handler abort the caller or skip remaining handlers', () => {
    const a = vi.fn()
    const throwing = vi.fn(() => {
      throw new TypeError("undefined is not an object (evaluating 'e[t]')")
    })
    const c = vi.fn()
    register(a)
    register(throwing)
    register(c)
    expect(() => pauseOthers(a)).not.toThrow()
    expect(throwing).toHaveBeenCalledOnce()
    expect(c).toHaveBeenCalledOnce()
  })
})
