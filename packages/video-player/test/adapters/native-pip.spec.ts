import { describe, it, expect } from 'vite-plus/test'
import { createNativeAdapter } from '@/adapters/native'

/**
 * jsdom doesn't implement the Picture-in-Picture API at all (document.pictureInPictureEnabled is
 * undefined, not a real boolean) — this documents that supportsPip() correctly falls back to
 * false there, same as a real browser without PiP support, rather than throwing or reporting a
 * false positive. Actually entering/exiting PiP isn't testable in this environment.
 */
describe('native adapter — Picture-in-Picture (jsdom has no real PiP API)', () => {
  it('supportsPip reports false when the browser has no PiP support', () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'video.mp4' })

    expect(adapter.supportsPip()).toBe(false)
  })

  it('isPipActive reports false when nothing is in Picture-in-Picture', () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'video.mp4' })

    expect(adapter.isPipActive()).toBe(false)
  })

  it('togglePip is a safe no-op when PiP is unsupported', () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'video.mp4' })

    expect(() => adapter.togglePip()).not.toThrow()
  })
})
