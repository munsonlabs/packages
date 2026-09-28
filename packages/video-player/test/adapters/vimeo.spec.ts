import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createVimeoAdapter } from '@/adapters/embeds/vimeo'
import type { EmbedAdapterOptions } from '@/types/playback'
import { loadScript } from '@/adapters/loadScript'
import { createDeferred, flush } from '@test/helpers'

vi.mock('@/adapters/loadScript', () => ({ loadScript: vi.fn(() => Promise.resolve()) }))

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
  textTracks: VimeoTextTrack[] = []
  getTextTracks = vi.fn(() => Promise.resolve(this.textTracks.map((t) => ({ ...t }))))
  enableTextTrack = vi.fn((language: string, kind?: string) => {
    const track = this.textTracks.find((t) => t.language === language && (!kind || t.kind === kind))
    if (!track) return Promise.reject(new Error('InvalidTrackLanguageError'))
    this.textTracks.forEach((t) => (t.mode = t === track ? 'showing' : 'disabled'))
    return Promise.resolve({ ...track })
  })
  disableTextTrack = vi.fn(() => {
    this.textTracks.forEach((t) => (t.mode = 'disabled'))
    return Promise.resolve()
  })

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
  it('reports false and setPlaybackRate is a no-op', async () => {
    const { adapter, player } = await createAdapter()

    adapter.setPlaybackRate(2)

    expect(player.setPlaybackRate).not.toHaveBeenCalled()
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

describe('SDK load failure', () => {
  it('surfaces a rejected player.js load as an error event with a message (instead of hanging)', async () => {
    vi.mocked(loadScript).mockRejectedValueOnce(new Error('Failed to load script: player.js'))
    const videoEl = document.createElement('video')
    document.body.appendChild(videoEl)
    const adapter = createVimeoAdapter(videoEl, { src: 'https://vimeo.com/347119375' })
    const error = vi.fn()
    adapter.on('error', error)

    await flush(4)

    expect(error).toHaveBeenCalledOnce()
    expect(adapter.error()).toEqual({ code: 4, message: 'Failed to load script: player.js' })
    expect(players).toHaveLength(0)
  })

  it('does not fire error on an adapter disposed before the load failed', async () => {
    vi.mocked(loadScript).mockRejectedValueOnce(new Error('offline'))
    const videoEl = document.createElement('video')
    document.body.appendChild(videoEl)
    const adapter = createVimeoAdapter(videoEl, { src: 'https://vimeo.com/347119375' })
    const error = vi.fn()
    adapter.on('error', error)
    adapter.dispose()

    await flush(4)

    expect(error).not.toHaveBeenCalled()
  })

  it('errors when the script loads but never defines window.Vimeo', async () => {
    delete window.Vimeo
    const videoEl = document.createElement('video')
    document.body.appendChild(videoEl)
    const adapter = createVimeoAdapter(videoEl, { src: 'https://vimeo.com/347119375' })
    const error = vi.fn()
    adapter.on('error', error)

    await flush(4)

    expect(error).toHaveBeenCalledOnce()
    expect(adapter.error()?.message).toMatch(/failed to load/i)
  })

  it('load() after a failed load (Retry) clears the error and re-runs the SDK connect', async () => {
    vi.mocked(loadScript).mockClear()
    vi.mocked(loadScript).mockRejectedValueOnce(new Error('offline'))
    const videoEl = document.createElement('video')
    document.body.appendChild(videoEl)
    const adapter = createVimeoAdapter(videoEl, { src: 'https://vimeo.com/347119375' })
    await flush(4)
    expect(adapter.error()).not.toBeNull()
    expect(players).toHaveLength(0)

    adapter.load('https://vimeo.com/347119375')
    await flush(4)

    expect(loadScript).toHaveBeenCalledTimes(2)
    expect(adapter.error()).toBeNull()
    expect(players).toHaveLength(1)
  })

  it('load() swaps the source on a healthy player by reconnecting to it', async () => {
    const { adapter } = await createAdapter()
    expect(players).toHaveLength(1)

    adapter.load('https://vimeo.com/999')
    await flush(4)

    expect(players[0].destroyed).toBe(true)
    expect(players).toHaveLength(2)
    expect(players[1].options.id).toBe(999)
  })
})

describe('runtime SDK errors', () => {
  it('records the SDK reason so error() reports it instead of a generic message', async () => {
    const { adapter, player } = await createAdapter()
    player.readyDeferred.resolve()
    await flush()

    player.trigger('error', { message: 'Because of its privacy settings, this video cannot be played here.' })

    expect(adapter.error()).toEqual({ code: 4, message: 'Because of its privacy settings, this video cannot be played here.' })
  })

  it('falls back to a friendly message when the SDK gives none', async () => {
    const { adapter, player } = await createAdapter()
    player.readyDeferred.resolve()
    await flush()

    player.trigger('error', {})

    expect(adapter.error()?.message).toBe('This video is unavailable or cannot be embedded here.')
  })

  it('lets retry rebuild the player after a runtime error', async () => {
    const { adapter, player } = await createAdapter()
    player.readyDeferred.resolve()
    await flush()
    player.trigger('error', { message: 'nope' })

    adapter.load('https://vimeo.com/347119375')
    await flush()

    expect(player.destroy).toHaveBeenCalled()
    expect(players.length).toBe(2)
    expect(adapter.error()).toBeNull()
  })
})

describe('captions', () => {
  const EN: VimeoTextTrack = { label: 'English', language: 'en', kind: 'captions', mode: 'disabled' }
  const FR: VimeoTextTrack = { label: 'Français', language: 'fr', kind: 'subtitles', mode: 'disabled' }

  async function readyWithTracks(tracks: VimeoTextTrack[]) {
    const created = await createAdapter()
    created.player.textTracks = tracks.map((t) => ({ ...t }))
    const captionschange = vi.fn()
    created.adapter.on('captionschange', captionschange)
    created.player.readyDeferred.resolve()
    await flush()
    return { ...created, captionschange }
  }

  it('lists the text tracks once the player is ready and announces them', async () => {
    const { adapter, captionschange } = await readyWithTracks([EN, FR])

    expect(adapter.captions?.tracks()).toEqual([
      { index: 0, label: 'English', language: 'en' },
      { index: 1, label: 'Français', language: 'fr' },
    ])
    expect(adapter.captions?.active()).toBeNull()
    expect(captionschange).toHaveBeenCalled()
  })

  it('reports a track Vimeo already has showing as active', async () => {
    const { adapter } = await readyWithTracks([EN, { ...FR, mode: 'showing' }])

    expect(adapter.captions?.active()).toBe(1)
  })

  it('enables the picked track by language and kind, and answers active() before the SDK confirms', async () => {
    const { adapter, player } = await readyWithTracks([EN, FR])

    adapter.captions?.select(1)

    expect(adapter.captions?.active()).toBe(1)
    expect(player.enableTextTrack).toHaveBeenCalledWith('fr', 'subtitles')
  })

  it('disables captions when the selection is cleared', async () => {
    const { adapter, player } = await readyWithTracks([{ ...EN, mode: 'showing' }])

    adapter.captions?.select(null)

    expect(adapter.captions?.active()).toBeNull()
    expect(player.disableTextTrack).toHaveBeenCalledOnce()
  })

  it('follows a switch made inside Vimeo through texttrackchange', async () => {
    const { adapter, player, captionschange } = await readyWithTracks([EN, FR])
    captionschange.mockClear()

    player.textTracks[0].mode = 'showing'
    player.trigger('texttrackchange', { kind: 'captions', label: 'English', language: 'en' })
    await flush()

    expect(adapter.captions?.active()).toBe(0)
    expect(captionschange).toHaveBeenCalled()
  })

  it('resyncs from the SDK when Vimeo rejects the switch', async () => {
    const { adapter, player } = await readyWithTracks([EN])
    player.enableTextTrack.mockImplementationOnce(() => Promise.reject(new Error('nope')))

    adapter.captions?.select(0)
    expect(adapter.captions?.active()).toBe(0)
    await flush()

    expect(adapter.captions?.active()).toBeNull()
  })

  it('ignores an index that is not in the track list', async () => {
    const { adapter, player } = await readyWithTracks([EN])

    adapter.captions?.select(5)

    expect(adapter.captions?.active()).toBeNull()
    expect(player.enableTextTrack).not.toHaveBeenCalled()
  })

  it('clears the tracks when a new source is loaded', async () => {
    const { adapter } = await readyWithTracks([EN])

    adapter.load('https://vimeo.com/76979871')

    expect(adapter.captions?.tracks()).toEqual([])
    expect(adapter.captions?.active()).toBeNull()
  })
})
