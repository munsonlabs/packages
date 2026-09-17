import { describe, it, expect, vi, afterEach } from 'vite-plus/test'
import { withSetup } from '@test/composables/withSetup'
import { useFullscreen } from '@/composables/player/useFullscreen'
import { createEmitter } from '@/composables/player/emitter'
import type { PlaybackAdapter } from '@/types/playback'

function setFullscreenElement(el: Element | null): void {
  Object.defineProperty(document, 'fullscreenElement', { value: el, configurable: true })
}

afterEach(() => setFullscreenElement(null))

function makeAdapter(): { adapter: PlaybackAdapter; emitter: ReturnType<typeof createEmitter> } {
  const emitter = createEmitter()
  const adapter: PlaybackAdapter = {
    enterFullscreen: vi.fn(),
    exitFullscreen: vi.fn(),
    on: emitter.on,
    off: emitter.off,
  } as unknown as PlaybackAdapter
  return { adapter, emitter }
}

function setup(player: PlaybackAdapter | null) {
  const { result } = withSetup(() => useFullscreen(() => player))
  return result
}

describe('toggleFullscreen', () => {
  it('does nothing when there is no player yet', () => {
    const { toggleFullscreen } = setup(null)
    expect(() => toggleFullscreen()).not.toThrow()
  })

  it('requests fullscreen and marks it pending when not already fullscreen', () => {
    const { adapter } = makeAdapter()
    const { toggleFullscreen, isFullscreenPending } = setup(adapter)

    toggleFullscreen()

    expect(adapter.enterFullscreen).toHaveBeenCalledOnce()
    expect(isFullscreenPending.value).toBe(true)
  })

  it('exits fullscreen instead of requesting it when already fullscreen', () => {
    const { adapter } = makeAdapter()
    const { toggleFullscreen, isFullscreen } = setup(adapter)
    isFullscreen.value = true

    toggleFullscreen()

    expect(adapter.exitFullscreen).toHaveBeenCalledOnce()
    expect(adapter.enterFullscreen).not.toHaveBeenCalled()
  })
})

describe('document fullscreenchange', () => {
  it('picks up isFullscreen from document.fullscreenElement once the browser confirms it', () => {
    const { adapter } = makeAdapter()
    const { toggleFullscreen, isFullscreen, isFullscreenPending } = setup(adapter)
    toggleFullscreen()

    const shell = document.createElement('div')
    setFullscreenElement(shell)
    document.dispatchEvent(new Event('fullscreenchange'))

    expect(isFullscreen.value).toBe(true)
    expect(isFullscreenPending.value).toBe(false)
  })

  it('clears isFullscreen once the document reports no fullscreen element', () => {
    const { adapter } = makeAdapter()
    const { isFullscreen } = setup(adapter)
    setFullscreenElement(document.createElement('div'))
    document.dispatchEvent(new Event('fullscreenchange'))
    expect(isFullscreen.value).toBe(true)

    setFullscreenElement(null)
    document.dispatchEvent(new Event('fullscreenchange'))

    expect(isFullscreen.value).toBe(false)
  })
})

describe('attachPlayerEvents', () => {
  it('tracks pending state via the fullscreen-pending player events', () => {
    const { adapter, emitter } = makeAdapter()
    const { attachPlayerEvents, isFullscreenPending } = setup(adapter)
    attachPlayerEvents(adapter)

    emitter.trigger('fullscreen-pending')
    expect(isFullscreenPending.value).toBe(true)

    emitter.trigger('fullscreen-pending-done')
    expect(isFullscreenPending.value).toBe(false)
  })

  it('tracks isFullscreen via native fullscreen events (the iOS webkitEnterFullscreen path)', () => {
    const { adapter, emitter } = makeAdapter()
    const { attachPlayerEvents, isFullscreen, isFullscreenPending } = setup(adapter)
    attachPlayerEvents(adapter)

    emitter.trigger('nativefullscreenenter')
    expect(isFullscreen.value).toBe(true)

    emitter.trigger('nativefullscreenexit')
    expect(isFullscreen.value).toBe(false)
    expect(isFullscreenPending.value).toBe(false)
  })
})
