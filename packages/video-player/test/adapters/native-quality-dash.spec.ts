import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'

const DashEvents = {
  QUALITY_CHANGE_RENDERED: 'qualityChangeRendered',
  STREAM_INITIALIZED: 'streamInitialized',
  ERROR: 'error',
}

type Listener = (...args: unknown[]) => void

class FakeDashInstance {
  listeners: Record<string, Listener[]> = {}
  bitrateList: Array<{ qualityIndex: number; height: number; bitrate: number }> = []
  currentQuality = -1
  autoSwitchBitrateVideo = true
  destroy = vi.fn()
  initialize = vi.fn()

  on(event: string, cb: Listener): void {
    ;(this.listeners[event] ??= []).push(cb)
  }

  emit(event: string, data?: unknown): void {
    for (const cb of this.listeners[event] ?? []) cb(event, data)
  }

  getBitrateInfoListFor(): Array<{ qualityIndex: number; height: number; bitrate: number }> {
    return this.bitrateList
  }

  getQualityFor(): number {
    return this.currentQuality
  }

  setQualityFor(_type: string, value: number): void {
    this.currentQuality = value
  }

  getSettings(): { streaming: { abr: { autoSwitchBitrate: { video: boolean } } } } {
    return { streaming: { abr: { autoSwitchBitrate: { video: this.autoSwitchBitrateVideo } } } }
  }

  updateSettings(settings: { streaming?: { abr?: { autoSwitchBitrate?: { video?: boolean } } } }): void {
    const video = settings.streaming?.abr?.autoSwitchBitrate?.video
    if (video !== undefined) this.autoSwitchBitrateVideo = video
  }
}

const instances: FakeDashInstance[] = []

function MediaPlayer(): { create: () => FakeDashInstance } {
  return {
    create: () => {
      const instance = new FakeDashInstance()
      instances.push(instance)
      return instance
    },
  }
}

MediaPlayer.events = DashEvents

vi.mock('dashjs', () => ({ MediaPlayer }))

// Imported after the mock registration above so native.ts's dynamic import('dashjs') resolves to the fake.
const { createNativeAdapter } = await import('@/adapters/native')

function lastInstance(): FakeDashInstance {
  return instances[instances.length - 1]
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('native adapter — quality (dash.js)', () => {
  beforeEach(() => {
    instances.length = 0
  })

  it('reports no quality support before the stream has initialized', async () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'stream.mpd', type: 'application/dash+xml' })
    await flushMicrotasks()

    expect(adapter.quality!.levels().length > 0).toBe(false)
    expect(adapter.quality!.levels()).toEqual([])
  })

  it('lists levels and reports Auto once the stream initializes', async () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'stream.mpd', type: 'application/dash+xml' })
    await flushMicrotasks()

    lastInstance().bitrateList = [
      { qualityIndex: 0, height: 480, bitrate: 800_000 },
      { qualityIndex: 1, height: 1080, bitrate: 3_000_000 },
    ]
    lastInstance().currentQuality = 1
    lastInstance().emit(DashEvents.STREAM_INITIALIZED)

    expect(adapter.quality!.levels().length > 0).toBe(true)
    expect(adapter.quality!.levels()).toEqual([
      { index: 0, height: 480, bitrate: 800_000, label: '480p' },
      { index: 1, height: 1080, bitrate: 3_000_000, label: '1080p' },
    ])
    expect(adapter.quality!.isAuto()).toBe(true)
    expect(adapter.quality!.current()).toBe(null)
  })

  it('setQuality(index) calls setQualityFor with replace:true so the switch takes effect immediately', async () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'stream.mpd', type: 'application/dash+xml' })
    await flushMicrotasks()

    lastInstance().bitrateList = [{ qualityIndex: 0, height: 480, bitrate: 800_000 }]
    lastInstance().emit(DashEvents.STREAM_INITIALIZED)

    const setQualityFor = vi.spyOn(lastInstance(), 'setQualityFor')
    adapter.quality!.select(0)

    expect(setQualityFor).toHaveBeenCalledWith('video', 0, true)
  })

  it('setQuality(index) disables ABR auto-switching for video before setting the level', async () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'stream.mpd', type: 'application/dash+xml' })
    await flushMicrotasks()

    lastInstance().bitrateList = [{ qualityIndex: 0, height: 480, bitrate: 800_000 }]
    lastInstance().emit(DashEvents.STREAM_INITIALIZED)

    adapter.quality!.select(0)

    expect(lastInstance().autoSwitchBitrateVideo).toBe(false)
    expect(lastInstance().currentQuality).toBe(0)
  })

  it('setQuality(null) re-enables ABR auto-switching for video', async () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'stream.mpd', type: 'application/dash+xml' })
    await flushMicrotasks()

    lastInstance().autoSwitchBitrateVideo = false
    adapter.quality!.select(null)

    expect(lastInstance().autoSwitchBitrateVideo).toBe(true)
  })

  it('emits qualitychange on both STREAM_INITIALIZED and QUALITY_CHANGE_RENDERED', async () => {
    const videoEl = document.createElement('video')
    const adapter = createNativeAdapter(videoEl, { src: 'stream.mpd', type: 'application/dash+xml' })
    await flushMicrotasks()

    const listener = vi.fn()
    adapter.on('qualitychange', listener)

    lastInstance().emit(DashEvents.STREAM_INITIALIZED)
    expect(listener).toHaveBeenCalledTimes(1)

    lastInstance().emit(DashEvents.QUALITY_CHANGE_RENDERED)
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
