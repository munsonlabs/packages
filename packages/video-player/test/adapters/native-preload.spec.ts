import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { HLS_MIME_TYPE } from '@/constants'

type Listener = (...args: unknown[]) => void

class FakeHlsInstance {
  static Events = { ERROR: 'hlsError', MANIFEST_PARSED: 'hlsManifestParsed', LEVEL_SWITCHED: 'hlsLevelSwitched' }
  static ErrorTypes = { NETWORK_ERROR: 'networkError', MEDIA_ERROR: 'mediaError', OTHER_ERROR: 'otherError' }
  static isSupported = () => true

  config: Record<string, unknown>
  destroy = vi.fn()
  startLoad = vi.fn()
  recoverMediaError = vi.fn()
  loadSource = vi.fn()
  attachMedia = vi.fn()
  on = vi.fn<(event: string, cb: Listener) => void>()

  constructor(config: Record<string, unknown>) {
    this.config = config
  }
}

const instances: FakeHlsInstance[] = []

vi.mock('hls.js', () => ({
  default: class extends FakeHlsInstance {
    constructor(config: Record<string, unknown>) {
      super(config)
      instances.push(this)
    }
  },
}))

// Imported after the mock registration above so native.ts's dynamic import('hls.js') resolves to the fake.
const { createNativeAdapter } = await import('@/adapters/native')

function lastInstance(): FakeHlsInstance {
  return instances[instances.length - 1]
}

function makeVideo(): HTMLVideoElement {
  const video = document.createElement('video')
  // jsdom doesn't implement media playback - play() would otherwise throw "not implemented".
  video.play = vi.fn(() => Promise.resolve())
  return video
}

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  instances.length = 0
})

describe('preload - native <video>', () => {
  it('leaves the browser default alone when unset', () => {
    const video = makeVideo()
    createNativeAdapter(video, { src: 'https://example.com/a.mp4', type: 'video/mp4' })
    expect(video.hasAttribute('preload')).toBe(false)
  })

  it.each(['none', 'metadata', 'auto'] as const)('sets preload="%s" on the element', (mode) => {
    const video = makeVideo()
    createNativeAdapter(video, { src: 'https://example.com/a.mp4', type: 'video/mp4', preload: mode })
    expect(video.preload).toBe(mode)
  })
})

describe('preload - hls.js', () => {
  it('lets hls.js start loading immediately by default', async () => {
    const video = makeVideo()
    createNativeAdapter(video, { src: 'https://example.com/a.m3u8', type: HLS_MIME_TYPE, preload: 'auto' })
    await flush()
    expect(lastInstance().config.autoStartLoad).toBe(true)
  })

  it('holds segment loading back with preload="none" until the first play()', async () => {
    const video = makeVideo()
    const adapter = createNativeAdapter(video, { src: 'https://example.com/a.m3u8', type: HLS_MIME_TYPE, preload: 'none' })
    await flush()
    const hls = lastInstance()
    expect(hls.config.autoStartLoad).toBe(false)
    expect(hls.startLoad).not.toHaveBeenCalled()

    void adapter.play()
    expect(hls.startLoad).toHaveBeenCalledOnce()
    expect(video.play).toHaveBeenCalledOnce()

    void adapter.play()
    expect(hls.startLoad).toHaveBeenCalledOnce()
  })

  it('ignores preload="none" when autoplay is set, since autoplay needs the data anyway', async () => {
    const video = makeVideo()
    createNativeAdapter(video, { src: 'https://example.com/a.m3u8', type: HLS_MIME_TYPE, preload: 'none', autoplay: true })
    await flush()
    expect(lastInstance().config.autoStartLoad).toBe(true)
  })
})
