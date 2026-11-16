import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { observeViewportPriority } from '@/ui/player/viewport/viewportObserver'

interface FakeObserver {
  callback: (entries: IntersectionObserverEntry[]) => void
  options: IntersectionObserverInit
  disconnect: ReturnType<typeof vi.fn>
}

let observers: FakeObserver[] = []

function show(observer: FakeObserver, ratio: number): void {
  observer.callback([
    {
      isIntersecting: ratio > 0,
      intersectionRatio: ratio,
      rootBounds: { width: 1000, height: 800 },
      boundingClientRect: { width: 600, height: 400 },
    } as unknown as IntersectionObserverEntry,
  ])
}

beforeEach(() => {
  vi.useFakeTimers()
  observers = []
  window.IntersectionObserver = class {
    constructor(callback: FakeObserver['callback'], options: IntersectionObserverInit) {
      observers.push({ callback, options, disconnect: this.disconnect })
    }
    observe = vi.fn()
    disconnect = vi.fn()
    unobserve = vi.fn()
    takeRecords = vi.fn()
  } as unknown as typeof IntersectionObserver
})

afterEach(() => vi.useRealTimers())

describe('observeViewportPriority', () => {
  it('wins once half is on screen by default', () => {
    const onWin = vi.fn()
    observeViewportPriority(document.createElement('div'), onWin)

    show(observers[0], 0.4)
    vi.runAllTimers()
    expect(onWin).not.toHaveBeenCalled()

    show(observers[0], 0.5)
    vi.runAllTimers()
    expect(onWin).toHaveBeenCalledOnce()
  })

  it('waits for the ratio it was given', () => {
    const onWin = vi.fn()
    observeViewportPriority(document.createElement('div'), onWin, 1)
    expect(observers[0].options.threshold).toContain(0.98)

    show(observers[0], 0.6)
    vi.runAllTimers()
    expect(onWin).not.toHaveBeenCalled()

    show(observers[0], 1)
    vi.runAllTimers()
    expect(onWin).toHaveBeenCalledOnce()
  })

  it('wins again only after dropping below the ratio and coming back', () => {
    const onWin = vi.fn()
    observeViewportPriority(document.createElement('div'), onWin)

    show(observers[0], 0.5)
    show(observers[0], 0.8)
    vi.runAllTimers()
    expect(onWin).toHaveBeenCalledOnce()

    show(observers[0], 0.2)
    show(observers[0], 0.6)
    vi.runAllTimers()
    expect(onWin).toHaveBeenCalledTimes(2)
  })

  it('lets only the last of several shells crossing at once win', () => {
    const first = vi.fn()
    const second = vi.fn()
    observeViewportPriority(document.createElement('div'), first)
    observeViewportPriority(document.createElement('div'), second)

    show(observers[0], 1)
    show(observers[1], 1)
    vi.runAllTimers()

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
  })

  it('drops a pending win and stops observing once unobserved', () => {
    const onWin = vi.fn()
    const unobserve = observeViewportPriority(document.createElement('div'), onWin)

    show(observers[0], 1)
    unobserve()
    vi.runAllTimers()

    expect(onWin).not.toHaveBeenCalled()
    expect(observers[0].disconnect).toHaveBeenCalled()
  })
})
