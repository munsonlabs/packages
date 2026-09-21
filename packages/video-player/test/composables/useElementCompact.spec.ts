import { describe, it, expect, beforeEach, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { withSetup } from '@test/composables/withSetup'
import { useElementCompact } from '@/composables/useElementCompact'

class MockResizeObserver {
  static instances: MockResizeObserver[] = []
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
  constructor(private callback: ResizeObserverCallback) {
    MockResizeObserver.instances.push(this)
  }
  trigger(width: number): void {
    this.callback([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver)
  }
}

describe('useElementCompact', () => {
  beforeEach(() => {
    MockResizeObserver.instances = []
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
  })

  it('is not compact before an element is observed', () => {
    expect(withSetup(() => useElementCompact(ref(null), 250)).result.value).toBe(false)
  })

  it('goes compact once the observed element narrows past the threshold', () => {
    const { result: compact } = withSetup(() => useElementCompact(ref(document.createElement('div')), 250))
    MockResizeObserver.instances[0].trigger(200)
    expect(compact.value).toBe(true)
  })

  it('stays full-width at or above the threshold', () => {
    const { result: compact } = withSetup(() => useElementCompact(ref(document.createElement('div')), 250))
    MockResizeObserver.instances[0].trigger(250)
    expect(compact.value).toBe(false)
  })
})
