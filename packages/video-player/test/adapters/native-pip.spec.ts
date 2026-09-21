import { describe, it, expect } from 'vite-plus/test'
import { createNativeAdapter } from '@/adapters/native'

describe('native adapter — Picture-in-Picture (jsdom has no real PiP API)', () => {
  it('supportsPip reports false when the browser has no PiP support', () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'video.mp4' })

    expect(adapter.pip!.isSupported()).toBe(false)
  })

  it('isPipActive reports false when nothing is in Picture-in-Picture', () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'video.mp4' })

    expect(adapter.pip!.isActive()).toBe(false)
  })

  it('togglePip is a safe no-op when PiP is unsupported', () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'video.mp4' })

    expect(() => adapter.pip!.toggle()).not.toThrow()
  })
})
