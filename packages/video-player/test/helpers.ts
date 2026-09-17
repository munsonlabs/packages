import { vi } from 'vite-plus/test'

export function createDeferred<T = void>() {
  let resolve!: (value: T) => void
  let reject!: (err: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export async function flush(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) await Promise.resolve()
}

export type IntersectionCallback = (entries: Array<{ intersectionRatio: number }>) => void

export function mockIntersectionObserver() {
  const state = {
    callback: null as IntersectionCallback | null,
    observe: vi.fn(),
    disconnect: vi.fn(),
    fire(inView: boolean) {
      state.callback?.([{ intersectionRatio: inView ? 1 : 0 }])
    },
  }
  window.IntersectionObserver = class {
    constructor(cb: unknown) {
      state.callback = cb as IntersectionCallback
    }
    observe = state.observe
    disconnect = state.disconnect
    unobserve = vi.fn()
    takeRecords = vi.fn()
  } as unknown as typeof IntersectionObserver
  return state
}
