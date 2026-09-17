import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createYoutubeAdapter } from '@/adapters/embeds/youtube'
import { loadScript } from '@/utils/loadScript'

// Lives in its own file on purpose: the YouTube adapter caches the ready IFrame API at module
// scope, so a failing load can only be exercised while that module has never seen a success.
// The one success case here runs last for the same reason.
vi.mock('@/utils/loadScript', () => ({ loadScript: vi.fn(() => Promise.resolve()) }))

const PlayerState = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 }
let created = 0

function installFakeYT(): void {
  created = 0
  window.YT = {
    PlayerState,
    ready: (cb: () => void) => cb(),
    Player: class {
      constructor() {
        created++
      }
    } as unknown as YTNamespace['Player'],
  }
}

beforeEach(() => {
  installFakeYT()
})

afterEach(() => {
  delete window.YT
})

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) await Promise.resolve()
}

function mount() {
  const videoEl = document.createElement('video')
  document.body.appendChild(videoEl)
  const adapter = createYoutubeAdapter(videoEl, { src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
  const error = vi.fn()
  adapter.on('error', error)
  return { adapter, error }
}

describe('SDK load failure', () => {
  it('surfaces a rejected iframe_api load as an error event with a message (instead of hanging)', async () => {
    vi.mocked(loadScript).mockRejectedValueOnce(new Error('Failed to load script: iframe_api'))

    const { adapter, error } = mount()
    await flush()

    expect(error).toHaveBeenCalledOnce()
    expect(adapter.error()).toEqual({ code: 4, message: 'Failed to load script: iframe_api' })
    expect(created).toBe(0)
  })

  it('does not fire error on an adapter disposed before the load failed', async () => {
    vi.mocked(loadScript).mockRejectedValueOnce(new Error('offline'))

    const { adapter, error } = mount()
    adapter.dispose()
    await flush()

    expect(error).not.toHaveBeenCalled()
  })

  it('errors when the script loads but never defines window.YT', async () => {
    delete window.YT

    const { adapter, error } = mount()
    await flush()

    expect(error).toHaveBeenCalledOnce()
    expect(adapter.error()?.message).toMatch(/failed to load/i)
  })

  it('reports one failed load to every waiting adapter; setSrc() (Retry) then re-runs the connect from scratch', async () => {
    vi.mocked(loadScript).mockClear()
    vi.mocked(loadScript).mockRejectedValueOnce(new Error('offline'))

    const a = mount()
    const b = mount()
    await flush()
    expect(a.error).toHaveBeenCalledOnce()
    expect(b.error).toHaveBeenCalledOnce()
    expect(loadScript).toHaveBeenCalledTimes(1)
    expect(created).toBe(0)

    // Default mock resolves - Retry must kick off a fresh load and initialise normally.
    a.adapter.setSrc('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await flush()

    expect(loadScript).toHaveBeenCalledTimes(2)
    expect(a.adapter.error()).toBeNull()
    expect(created).toBe(1)
  })
})
