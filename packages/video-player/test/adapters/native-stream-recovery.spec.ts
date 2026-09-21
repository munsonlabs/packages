import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'

const HlsEvents = {
  ERROR: 'hlsError',
  MANIFEST_PARSED: 'hlsManifestParsed',
  LEVEL_SWITCHED: 'hlsLevelSwitched',
  FRAG_BUFFERED: 'hlsFragBuffered',
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
  manualLevel = -1
  currentLevel = -1
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

const { createNativeAdapter } = await import('@/adapters/native')

function lastInstance(): FakeHlsInstance {
  return instances[instances.length - 1]
}

async function createHlsAdapter() {
  const videoEl = document.createElement('video')
  const adapter = createNativeAdapter(videoEl, { src: 'stream.m3u8', type: 'application/x-mpegURL' })
  await vi.advanceTimersByTimeAsync(0)
  return { adapter, videoEl }
}

function fatalNetworkError(): void {
  lastInstance().emit(HlsEvents.ERROR, { fatal: true, type: HlsErrorTypes.NETWORK_ERROR, reason: 'manifest load error' })
}

beforeEach(() => {
  instances.length = 0
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('native adapter — stream recovery', () => {
  it('backs off between retries instead of reloading immediately', async () => {
    await createHlsAdapter()

    fatalNetworkError()
    expect(lastInstance().startLoad).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1000)
    expect(lastInstance().startLoad).toHaveBeenCalledOnce()
  })

  it('gives up after a bounded number of attempts and surfaces the reason', async () => {
    const { adapter } = await createHlsAdapter()
    const onError = vi.fn()
    adapter.on('error', onError)

    for (let attempt = 0; attempt < 3; attempt++) {
      fatalNetworkError()
      await vi.advanceTimersByTimeAsync(10_000)
    }
    expect(onError).not.toHaveBeenCalled()

    fatalNetworkError()

    expect(onError).toHaveBeenCalledOnce()
    expect(adapter.error()).toEqual({ code: 4, message: 'manifest load error' })
    expect(lastInstance().destroy).toHaveBeenCalled()
  })

  it('resets the budget once a fragment buffers successfully', async () => {
    const { adapter } = await createHlsAdapter()
    const onError = vi.fn()
    adapter.on('error', onError)

    for (let attempt = 0; attempt < 3; attempt++) {
      fatalNetworkError()
      await vi.advanceTimersByTimeAsync(10_000)
    }
    lastInstance().emit(HlsEvents.FRAG_BUFFERED)

    fatalNetworkError()
    await vi.advanceTimersByTimeAsync(10_000)

    expect(onError).not.toHaveBeenCalled()
  })

  it('fails immediately on an error type that cannot be recovered', async () => {
    const { adapter } = await createHlsAdapter()
    const onError = vi.fn()
    adapter.on('error', onError)

    lastInstance().emit(HlsEvents.ERROR, { fatal: true, type: HlsErrorTypes.OTHER_ERROR, details: 'keySystemNoKeys' })

    expect(onError).toHaveBeenCalledOnce()
    expect(adapter.error()?.message).toBe('keySystemNoKeys')
  })

  it('ignores non-fatal errors', async () => {
    const { adapter } = await createHlsAdapter()
    const onError = vi.fn()
    adapter.on('error', onError)

    lastInstance().emit(HlsEvents.ERROR, { fatal: false, type: HlsErrorTypes.NETWORK_ERROR })
    await vi.advanceTimersByTimeAsync(10_000)

    expect(onError).not.toHaveBeenCalled()
    expect(lastInstance().startLoad).not.toHaveBeenCalled()
  })
})
