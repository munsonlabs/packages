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
  autoLevelEnabled = true
  destroy = vi.fn()
  startLoad = vi.fn()
  recoverMediaError = vi.fn()
  loadSource = vi.fn()
  attachMedia = vi.fn()

  manualLevel = -1
  playingLevel = -1

  get currentLevel(): number {
    return this.playingLevel
  }

  set currentLevel(level: number) {
    this.manualLevel = level
    this.autoLevelEnabled = level === -1
  }

  settleLevel(): void {
    this.playingLevel = this.manualLevel
  }

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
    lastInstance().playingLevel = 1
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

  it('collapses repeated resolutions to one entry each, ascending', async () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'stream.m3u8', type: 'application/x-mpegURL' })
    await flushMicrotasks()

    lastInstance().levels = [
      { height: 540, bitrate: 2_177_116 },
      { height: 1080, bitrate: 8_001_098 },
      { height: 1080, bitrate: 6_312_875 },
      { height: 1080, bitrate: 4_943_747 },
      { height: 720, bitrate: 3_216_424 },
      { height: 0, bitrate: 64_000 },
    ]
    lastInstance().emit(HlsEvents.MANIFEST_PARSED)

    expect(adapter.getQualityLevels()).toEqual([
      { index: 0, height: 540, bitrate: 2_177_116, label: '540p' },
      { index: 4, height: 720, bitrate: 3_216_424, label: '720p' },
      { index: 1, height: 1080, bitrate: 8_001_098, label: '1080p' },
    ])
  })

  it('setQuality(index) sets hls.currentLevel directly', async () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'stream.m3u8', type: 'application/x-mpegURL' })
    await flushMicrotasks()

    lastInstance().levels = [{ height: 480, bitrate: 800_000 }]
    lastInstance().emit(HlsEvents.MANIFEST_PARSED)

    adapter.setQuality(0)

    expect(lastInstance().manualLevel).toBe(0)
  })

  it('reports the level just selected, not the one still playing', async () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'stream.m3u8', type: 'application/x-mpegURL' })
    await flushMicrotasks()

    lastInstance().levels = [
      { height: 480, bitrate: 800_000 },
      { height: 1080, bitrate: 3_000_000 },
    ]
    lastInstance().playingLevel = 1
    lastInstance().emit(HlsEvents.MANIFEST_PARSED)

    adapter.setQuality(0)

    expect(lastInstance().currentLevel).toBe(1)
    expect(adapter.isAutoQuality()).toBe(false)
    expect(adapter.getCurrentQuality()).toBe(0)

    lastInstance().settleLevel()
    expect(adapter.getCurrentQuality()).toBe(0)
  })

  it('setQuality(null) re-enables auto (hls.js convention: currentLevel = -1)', async () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'stream.m3u8', type: 'application/x-mpegURL' })
    await flushMicrotasks()

    adapter.setQuality(null)

    expect(lastInstance().manualLevel).toBe(-1)
    expect(adapter.isAutoQuality()).toBe(true)
    expect(adapter.getCurrentQuality()).toBe(null)
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

describe('native adapter — quality index space', () => {
  beforeEach(() => {
    instances.length = 0
  })

  it('maps a filtered-out variant onto the level the ladder publishes', async () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'stream.m3u8', type: 'application/x-mpegURL' })
    await flushMicrotasks()

    // Two variants at 720p: the ladder keeps only the higher-bitrate one, at index 2.
    lastInstance().levels = [
      { height: 480, bitrate: 800_000 },
      { height: 720, bitrate: 1_500_000 },
      { height: 720, bitrate: 2_500_000 },
    ]
    lastInstance().currentLevel = 1

    const levels = adapter.getQualityLevels()
    expect(levels.map((level) => level.index)).toEqual([0, 2])
    expect(adapter.getCurrentQuality()).toBe(2)
    expect(levels.some((level) => level.index === adapter.getCurrentQuality())).toBe(true)
  })
})
