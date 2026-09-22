import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createDailymotionAdapter } from '@/adapters/embeds/dailymotion'
import type { EmbedAdapterOptions } from '@/types/playback'
import { loadScript } from '@/adapters/loadScript'
import { createDeferred, flush } from '@test/helpers'

vi.mock('@/adapters/loadScript', () => ({ loadScript: vi.fn(() => Promise.resolve()) }))

const DEFAULT_SRC = 'https://www.dailymotion.com/video/x84sh87'

const DM_EVENTS: Record<string, string> = {
  VIDEO_PLAY: 'VIDEO_PLAY',
  VIDEO_PLAYING: 'VIDEO_PLAYING',
  VIDEO_PAUSE: 'VIDEO_PAUSE',
  VIDEO_BUFFERING: 'VIDEO_BUFFERING',
  VIDEO_END: 'VIDEO_END',
  VIDEO_TIMECHANGE: 'VIDEO_TIMECHANGE',
  VIDEO_DURATIONCHANGE: 'VIDEO_DURATIONCHANGE',
  VIDEO_SEEKSTART: 'VIDEO_SEEKSTART',
  VIDEO_SEEKEND: 'VIDEO_SEEKEND',
  PLAYER_VOLUMECHANGE: 'PLAYER_VOLUMECHANGE',
  PLAYER_ERROR: 'PLAYER_ERROR',
  AD_START: 'AD_START',
  AD_END: 'AD_END',
}

class FakeDailymotionPlayer implements DailymotionPlayer {
  handlers: Record<string, Array<(state: unknown) => void>> = {}
  destroyed = false
  play = vi.fn()
  pause = vi.fn()
  seek = vi.fn((_seconds: number) => {})
  setVolume = vi.fn((_vol: number) => {})
  setMute = vi.fn((_muted: boolean) => {})
  setFullscreen = vi.fn((_fullscreen: boolean) => {})
  destroy = vi.fn(() => {
    this.destroyed = true
  })

  on(event: string, cb: (state: unknown) => void): void {
    ;(this.handlers[event] ??= []).push(cb)
  }

  trigger(event: string, state?: unknown): void {
    this.handlers[event]?.forEach((cb) => cb(state))
  }
}

let createPlayerDeferred: ReturnType<typeof createDeferred<FakeDailymotionPlayer>>

function installFakeDailymotion(): void {
  createPlayerDeferred = createDeferred<FakeDailymotionPlayer>()
  window.dailymotion = {
    events: DM_EVENTS,
    createPlayer: vi.fn(() => createPlayerDeferred.promise),
  }
}

function resolvePlayer(): FakeDailymotionPlayer {
  const player = new FakeDailymotionPlayer()
  createPlayerDeferred.resolve(player)
  return player
}

beforeEach(() => {
  installFakeDailymotion()
})

afterEach(() => {
  delete window.dailymotion
})

async function createAdapter(src = DEFAULT_SRC, options: Partial<EmbedAdapterOptions> = {}) {
  const videoEl = document.createElement('video')
  document.body.appendChild(videoEl)
  const adapter = createDailymotionAdapter(videoEl, { src, ...options })
  await flush() // let loadScript resolve and sdk.createPlayer(...) get called
  return { adapter, videoEl }
}

describe('video id parsing', () => {
  it('sets an error state (and never calls createPlayer) when the id cannot be parsed', async () => {
    const { adapter } = await createAdapter('https://www.dailymotion.com/not-a-video')

    expect(adapter.error()?.message).toMatch(/could not parse/i)
    expect(window.dailymotion?.createPlayer).not.toHaveBeenCalled()
  })
})

describe('play() queueing', () => {
  it('queues a play() called before the player object exists yet, dispatching it once created', async () => {
    const videoEl = document.createElement('video')
    document.body.appendChild(videoEl)
    const adapter = createDailymotionAdapter(videoEl, { src: DEFAULT_SRC })

    void adapter.play() // dm is still null at this point
    await flush()
    const player = resolvePlayer()
    await flush()

    expect(player.play).toHaveBeenCalledOnce()
  })
})

describe('event wiring', () => {
  it('tracks play/pause/ended state and forwards the corresponding events', async () => {
    const { adapter } = await createAdapter()
    const player = resolvePlayer()
    await flush()

    const play = vi.fn()
    const pause = vi.fn()
    const ended = vi.fn()
    adapter.on('play', play)
    adapter.on('pause', pause)
    adapter.on('ended', ended)

    player.trigger('VIDEO_PLAYING')
    expect(adapter.paused()).toBe(false)
    expect(play).toHaveBeenCalledOnce()

    player.trigger('VIDEO_PAUSE')
    expect(adapter.paused()).toBe(true)
    expect(pause).toHaveBeenCalledOnce()

    player.trigger('VIDEO_END')
    expect(adapter.paused()).toBe(true)
    expect(ended).toHaveBeenCalledOnce()
  })

  it('pauses back out an unrequested VIDEO_PLAY the first time it fires, when autoplay was not requested', async () => {
    const { adapter } = await createAdapter()
    const player = resolvePlayer()
    await flush()

    player.trigger('VIDEO_PLAY')
    expect(player.pause).toHaveBeenCalledOnce()

    player.trigger('VIDEO_PLAY')
    expect(player.pause).toHaveBeenCalledOnce()
    void adapter
  })

  it('does not pause back out VIDEO_PLAY when autoplay was requested', async () => {
    await createAdapter(undefined, { autoplay: true })
    const player = resolvePlayer()
    await flush()

    player.trigger('VIDEO_PLAY')

    expect(player.pause).not.toHaveBeenCalled()
  })

  it('tracks currentTime/duration via VIDEO_TIMECHANGE/VIDEO_DURATIONCHANGE', async () => {
    const { adapter } = await createAdapter()
    const player = resolvePlayer()
    await flush()
    const durationchange = vi.fn()
    adapter.on('durationchange', durationchange)

    player.trigger('VIDEO_TIMECHANGE', { videoTime: 12, videoDuration: 90 })
    expect(adapter.currentTime()).toBe(12)
    expect(adapter.duration()).toBe(90)

    player.trigger('VIDEO_DURATIONCHANGE', { videoDuration: 100 })
    expect(adapter.duration()).toBe(100)
    expect(durationchange).toHaveBeenCalledOnce()
  })

  it('tracks seeked via VIDEO_SEEKEND', async () => {
    const { adapter } = await createAdapter()
    const player = resolvePlayer()
    await flush()
    const seeked = vi.fn()
    adapter.on('seeked', seeked)

    player.trigger('VIDEO_SEEKEND', { videoTime: 30 })
    expect(adapter.currentTime()).toBe(30)
    expect(seeked).toHaveBeenCalledOnce()
  })

  it('tracks volume/mute via PLAYER_VOLUMECHANGE', async () => {
    const { adapter } = await createAdapter()
    const player = resolvePlayer()
    await flush()

    player.trigger('PLAYER_VOLUMECHANGE', { playerVolume: 0.3, playerIsMuted: true })

    expect(adapter.volume()).toBe(0.3)
    expect(adapter.muted()).toBe(true)
  })

  it('fires adstart/adend and treats an ad as playing', async () => {
    const { adapter } = await createAdapter()
    const player = resolvePlayer()
    await flush()
    const adstart = vi.fn()
    const adend = vi.fn()
    adapter.on('adstart', adstart)
    adapter.on('adend', adend)

    player.trigger('AD_START')
    expect(adstart).toHaveBeenCalledOnce()
    expect(adapter.paused()).toBe(false)

    player.trigger('AD_END')
    expect(adend).toHaveBeenCalledOnce()
  })

  it('fires an error event on PLAYER_ERROR', async () => {
    const { adapter } = await createAdapter()
    const player = resolvePlayer()
    await flush()
    const error = vi.fn()
    adapter.on('error', error)

    player.trigger('PLAYER_ERROR')

    expect(error).toHaveBeenCalledOnce()
  })
})

describe('methods', () => {
  it('forwards setCurrentTime/setVolume/setMuted to the SDK', async () => {
    const { adapter } = await createAdapter()
    const player = resolvePlayer()
    await flush()

    adapter.setCurrentTime(30)
    expect(player.seek).toHaveBeenCalledWith(30)
    expect(adapter.currentTime()).toBe(30)

    adapter.setVolume(0.6)
    expect(player.setVolume).toHaveBeenCalledWith(0.6)

    adapter.setMuted(true)
    expect(player.setMute).toHaveBeenCalledWith(true)
  })

  it('has no playback-rate support', async () => {
    const { adapter } = await createAdapter()

    expect(adapter.supportsPlaybackRate()).toBe(false)
    expect(adapter.playbackRate()).toBe(1)
    adapter.setPlaybackRate(2) // should not throw despite being a no-op
    expect(adapter.playbackRate()).toBe(1)
  })
})

describe('dispose', () => {
  it('destroys the underlying player', async () => {
    const { adapter } = await createAdapter()
    const player = resolvePlayer()
    await flush()

    adapter.dispose()

    expect(player.destroyed).toBe(true)
  })
})

describe('SDK load failure', () => {
  it('load() after a failed load (Retry) clears the error and re-runs the SDK connect', async () => {
    vi.mocked(loadScript).mockClear()
    vi.mocked(loadScript).mockRejectedValueOnce(new Error('offline'))
    const videoEl = document.createElement('video')
    document.body.appendChild(videoEl)
    const adapter = createDailymotionAdapter(videoEl, { src: DEFAULT_SRC })
    await flush()
    expect(adapter.error()?.message).toBe('offline')
    expect(window.dailymotion?.createPlayer).not.toHaveBeenCalled()

    adapter.load(DEFAULT_SRC)
    await flush()

    expect(loadScript).toHaveBeenCalledTimes(2)
    expect(adapter.error()).toBeNull()
    expect(window.dailymotion?.createPlayer).toHaveBeenCalledOnce()
  })
})

describe('dispose during connect', () => {
  it('destroys a player that arrives after the adapter was disposed', async () => {
    const { adapter } = await createAdapter()

    adapter.dispose()
    const player = resolvePlayer()
    await flush()

    expect(player.destroy).toHaveBeenCalled()
  })
})
