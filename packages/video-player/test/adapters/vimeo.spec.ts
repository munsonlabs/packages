import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createVimeoAdapter } from '@/adapters/embeds/vimeo'
import type { EmbedAdapterOptions } from '@/adapters/embeds/embedShared'

vi.mock('@/utils/loadScript', () => ({ loadScript: vi.fn(() => Promise.resolve()) }))

function createDeferred<T = void>() {
  let resolve!: (value: T) => void
  let reject!: (err: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

class FakeVimeoPlayer implements VimeoPlayerInstance {
  handlers: Record<string, Array<(data: unknown) => void>> = {}
  destroyed = false
  readyDeferred = createDeferred()

  constructor(
    public elementIdOrEl: string | HTMLElement,
    public options: VimeoPlayerOptions,
  ) {}

  ready(): Promise<void> {
    return this.readyDeferred.promise
  }
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn(() => Promise.resolve())
  destroy = vi.fn(() => {
    this.destroyed = true
    return Promise.resolve()
  })
  requestFullscreen = vi.fn(() => Promise.resolve())
  setCurrentTime = vi.fn((_seconds: number) => Promise.resolve())
  setVolume = vi.fn((_vol: number) => Promise.resolve())
  setMuted = vi.fn((_muted: boolean) => Promise.resolve())
  setPlaybackRate = vi.fn((_rate: number) => Promise.resolve())

  on(event: string, cb: (data: unknown) => void): void {
    ;(this.handlers[event] ??= []).push(cb)
  }

  trigger(event: string, data?: unknown): void {
    this.handlers[event]?.forEach((cb) => cb(data))
  }
}

let players: FakeVimeoPlayer[] = []

function installFakeVimeo(): void {
  players = []
  window.Vimeo = {
    Player: class {
      constructor(id: string | HTMLElement, options: VimeoPlayerOptions) {
        const player = new FakeVimeoPlayer(id, options)
        players.push(player)
        return player as unknown as FakeVimeoPlayer
      }
    } as unknown as VimeoPlayerConstructor,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  installFakeVimeo()
})

afterEach(() => {
  vi.useRealTimers()
  delete window.Vimeo
})

async function flush(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) await Promise.resolve()
}

async function createAdapter(src = 'https://vimeo.com/347119375', options: Partial<EmbedAdapterOptions> = {}) {
  const videoEl = document.createElement('video')
  document.body.appendChild(videoEl)
  const adapter = createVimeoAdapter(videoEl, { src, ...options })
  await flush()
  const player = players[players.length - 1]
  return { adapter, player, videoEl }
}

describe('video id parsing', () => {
  it('never constructs a player when the URL has no parseable video id', async () => {
    const { player } = await createAdapter('https://vimeo.com/not-a-video')

    expect(player).toBeUndefined()
  })
})

describe('play() queueing', () => {
  it('queues a play() called before the player object exists yet, dispatching it once ready', async () => {
    const videoEl = document.createElement('video')
    document.body.appendChild(videoEl)
    const adapter = createVimeoAdapter(videoEl, { src: 'https://vimeo.com/347119375' })

    void adapter.play() // vimeoPlayer is still null at this point
    await flush()
    const player = players[players.length - 1]
    expect(player.play).not.toHaveBeenCalled()

    player.readyDeferred.resolve()
    await flush()

    expect(player.play).toHaveBeenCalledOnce()
  })
})

describe('onPlayerReady', () => {
  it('mutes once ready when muted was requested', async () => {
    const { player } = await createAdapter(undefined, { muted: true })

    player.readyDeferred.resolve()
    await flush()

    expect(player.setMuted).toHaveBeenCalledWith(true)
  })

  it('surfaces a friendly error when the ready promise rejects', async () => {
    const { adapter, player } = await createAdapter()
    const error = vi.fn()
    adapter.on('error', error)

    player.readyDeferred.reject(new Error('nope'))
    await flush()

    expect(error).toHaveBeenCalledOnce()
    expect(adapter.error()?.message).toBe('nope')
  })
})

describe('event wiring', () => {
  it('tracks play/pause/ended state and forwards the corresponding events', async () => {
    const { adapter, player } = await createAdapter()
    const play = vi.fn()
    const pause = vi.fn()
    const ended = vi.fn()
    adapter.on('play', play)
    adapter.on('pause', pause)
    adapter.on('ended', ended)

    player.trigger('play')
    expect(adapter.paused()).toBe(false)
    expect(play).toHaveBeenCalledOnce()

    player.trigger('pause')
    expect(adapter.paused()).toBe(true)
    expect(pause).toHaveBeenCalledOnce()

    player.trigger('ended')
    expect(adapter.paused()).toBe(true)
    expect(ended).toHaveBeenCalledOnce()
  })

  it('tracks currentTime/duration via timeupdate, firing durationchange only once', async () => {
    const { adapter, player } = await createAdapter()
    const durationchange = vi.fn()
    adapter.on('durationchange', durationchange)

    player.trigger('timeupdate', { seconds: 5, duration: 120 })
    expect(adapter.currentTime()).toBe(5)
    expect(adapter.duration()).toBe(120)
    expect(durationchange).toHaveBeenCalledOnce()

    player.trigger('timeupdate', { seconds: 6, duration: 120 })
    expect(durationchange).toHaveBeenCalledOnce()
  })

  it('re-arms durationchange after a fresh loaded event', async () => {
    const { adapter, player } = await createAdapter()
    const durationchange = vi.fn()
    adapter.on('durationchange', durationchange)

    player.trigger('timeupdate', { seconds: 1, duration: 120 })
    expect(durationchange).toHaveBeenCalledOnce()

    // 'loaded' itself fires durationchange once (a fresh load, new metadata) and re-arms the
    // durationSet gate, so the very next timeupdate carrying a duration fires it again too.
    player.trigger('loaded')
    expect(durationchange).toHaveBeenCalledTimes(2)

    player.trigger('timeupdate', { seconds: 1, duration: 90 })
    expect(durationchange).toHaveBeenCalledTimes(3)
  })

  it('tracks volume via volumechange', async () => {
    const { adapter, player } = await createAdapter()

    player.trigger('volumechange', { volume: 0.4 })

    expect(adapter.volume()).toBe(0.4)
  })
})

describe('setMuted', () => {
  it('schedules a volumechange event shortly after the SDK confirms', async () => {
    const { adapter, player } = await createAdapter()
    const volumechange = vi.fn()
    adapter.on('volumechange', volumechange)

    adapter.setMuted(true)
    expect(player.setMuted).toHaveBeenCalledWith(true)
    expect(volumechange).not.toHaveBeenCalled()

    await flush(1) // let setMuted()'s own promise resolve before the schedule() timer starts
    vi.advanceTimersByTime(50)

    expect(volumechange).toHaveBeenCalledOnce()
  })
})

describe('supportsPlaybackRate', () => {
  it('reports false even though setPlaybackRate is implemented', async () => {
    const { adapter, player } = await createAdapter()

    adapter.setPlaybackRate(2)

    expect(player.setPlaybackRate).toHaveBeenCalledWith(2)
    expect(adapter.supportsPlaybackRate()).toBe(false)
  })
})

describe('dispose', () => {
  it('destroys the player and clears pending timers without throwing', async () => {
    const { adapter, player } = await createAdapter()
    adapter.setMuted(true) // schedules a volumechange timeout
    await flush(1)

    adapter.dispose()

    expect(player.destroy).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(1000)
  })
})
