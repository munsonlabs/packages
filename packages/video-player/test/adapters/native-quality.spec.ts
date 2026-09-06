import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'

const HlsEvents = {
  ERROR: 'hlsError',
  MANIFEST_PARSED: 'hlsManifestParsed',
  LEVEL_SWITCHED: 'hlsLevelSwitched',
}
const HlsErrorTypes = {
  NETWORK_ERROR: 'networkError',
  MEDIA_ERROR: 'mediaError',
  OTHER_ERROR: 'otherError',
}

type Listener = (...args: unknown[]) => void

class FakeHlsInstance {
  static Events = HlsEvents
  static ErrorTypes = HlsErrorTypes
  static isSupported = () => true

  listeners: Record<string, Listener[]> = {}
  levels: Array<{ height: number; bitrate: number }> = []
  currentLevel = -1
  autoLevelEnabled = true
  destroy = vi.fn()
  startLoad = vi.fn()
  recoverMediaError = vi.fn()
  loadSource = vi.fn()
  attachMedia = vi.fn()

  on(event: string, cb: Listener): void {
    ;(this.listeners[event] ??= []).push(cb)
  }

  emit(event: string, data?: unknown): void {
    for (const cb of this.listeners[event] ?? []) cb(event, data)
  }
}

const instances: FakeHlsInstance[] = []

vi.mock('hls.js', () => ({
  default: class extends FakeHlsInstance {
    constructor() {
      super()
      instances.push(this)
    }
  },
}))

// Imported after the mock registration above so native.ts's dynamic import('hls.js') resolves to the fake.
const { createNativeAdapter } = await import('@/adapters/native')

function lastInstance(): FakeHlsInstance {
  return instances[instances.length - 1]
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('native adapter — quality (hls.js)', () => {
  beforeEach(() => {
    instances.length = 0
  })

  it('reports no quality support before the manifest has parsed', async () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'stream.m3u8', type: 'application/x-mpegURL' })
    await flushMicrotasks()

    expect(adapter.supportsQuality()).toBe(false)
    expect(adapter.getQualityLevels()).toEqual([])
  })

  it('lists levels and reports Auto once the manifest parses', async () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'stream.m3u8', type: 'application/x-mpegURL' })
    await flushMicrotasks()

    lastInstance().levels = [
      { height: 480, bitrate: 800_000 },
      { height: 1080, bitrate: 3_000_000 },
    ]
    lastInstance().currentLevel = 1
    lastInstance().autoLevelEnabled = true
    lastInstance().emit(HlsEvents.MANIFEST_PARSED)

    expect(adapter.supportsQuality()).toBe(true)
    expect(adapter.getQualityLevels()).toEqual([
      { index: 0, height: 480, bitrate: 800_000, label: '480p' },
      { index: 1, height: 1080, bitrate: 3_000_000, label: '1080p' },
    ])
    expect(adapter.isAutoQuality()).toBe(true)
    expect(adapter.getCurrentQuality()).toBe(null)
  })

  it('setQuality(index) sets hls.currentLevel directly', async () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'stream.m3u8', type: 'application/x-mpegURL' })
    await flushMicrotasks()

    lastInstance().levels = [{ height: 480, bitrate: 800_000 }]
    lastInstance().emit(HlsEvents.MANIFEST_PARSED)

    adapter.setQuality(0)

    expect(lastInstance().currentLevel).toBe(0)
  })

  it('setQuality(null) re-enables auto (hls.js convention: currentLevel = -1)', async () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'stream.m3u8', type: 'application/x-mpegURL' })
    await flushMicrotasks()

    adapter.setQuality(null)

    expect(lastInstance().currentLevel).toBe(-1)
  })

  it('emits qualitychange on both MANIFEST_PARSED and LEVEL_SWITCHED', async () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'stream.m3u8', type: 'application/x-mpegURL' })
    await flushMicrotasks()

    const listener = vi.fn()
    adapter.on('qualitychange', listener)

    lastInstance().emit(HlsEvents.MANIFEST_PARSED)
    expect(listener).toHaveBeenCalledTimes(1)

    lastInstance().emit(HlsEvents.LEVEL_SWITCHED)
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
