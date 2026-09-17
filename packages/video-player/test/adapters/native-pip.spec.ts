import { describe, it, expect } from 'vite-plus/test'
import { createNativeAdapter } from '@/adapters/native'

/** jsdom has no PiP API, so this covers the unsupported branch only. */
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
