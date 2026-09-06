import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createYoutubeAdapter } from '@/adapters/embeds/youtube'
import type { EmbedAdapterOptions } from '@/adapters/embeds/embedShared'

vi.mock('@/utils/loadScript', () => ({ loadScript: vi.fn(() => Promise.resolve()) }))

const PlayerState = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 }

class FakeYTPlayer implements YTPlayer {
  currentTime = 0
  durationValue = 100
  volumePct = 100
  mutedState = false
  rate = 1
  rates: number[] = [1]
  state: number | null = null
  loadedFraction = 0
  playerResponse: { adPlacements?: unknown[] } | null = {}
  videoData: { video_id: string }
  events: NonNullable<YTPlayerOptions['events']>
  loadedVideoId: string | null = null
  cuedVideoId: string | null = null
  destroyed = false

  constructor(_elementId: string, options: YTPlayerOptions) {
    this.events = options.events ?? {}
    this.videoData = { video_id: options.videoId ?? 'seed' }
  }

  setState(state: number): void {
    this.state = state
    this.events.onStateChange?.({ data: state })
  }

  playVideo(): void {
    this.setState(PlayerState.PLAYING)
  }
  pauseVideo(): void {
    this.setState(PlayerState.PAUSED)
  }
  stopVideo(): void {}
  loadVideoById(options: { videoId: string }): void {
    this.loadedVideoId = options.videoId
  }
  cueVideoById(options: { videoId: string }): void {
    this.cuedVideoId = options.videoId
  }
  seekTo(seconds: number): void {
    this.currentTime = seconds
  }
  getCurrentTime(): number {
    return this.currentTime
  }
  getDuration(): number {
    return this.durationValue
  }
  getVideoLoadedFraction(): number {
    return this.loadedFraction
  }
  getPlaybackRate(): number {
    return this.rate
  }
  setPlaybackRate(rate: number): void {
    this.rate = rate
  }
  getAvailablePlaybackRates(): number[] {
    return this.rates
  }
  getVolume(): number {
    return this.volumePct
  }
  setVolume(pct: number): void {
    this.volumePct = pct
  }
  isMuted(): boolean {
    return this.mutedState
  }
  mute(): void {
    this.mutedState = true
  }
  unMute(): void {
    this.mutedState = false
  }
  getPlayerState(): number {
    return this.state ?? -1
  }
  getPlayerResponse(): { adPlacements?: unknown[] } | null {
    return this.playerResponse
  }
  getVideoData(): { video_id: string } {
    return this.videoData
  }
  destroy(): void {
    this.destroyed = true
  }
}

let players: FakeYTPlayer[] = []

function installFakeYT(): void {
  players = []
  window.YT = {
    PlayerState,
    ready: (cb: () => void) => cb(),
    Player: class {
      constructor(elementId: string, options: YTPlayerOptions) {
        const player = new FakeYTPlayer(elementId, options)
        players.push(player)
        return player as unknown as FakeYTPlayer
      }
    } as unknown as YTNamespace['Player'],
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  installFakeYT()
})

afterEach(() => {
  vi.useRealTimers()
  delete window.YT
})

async function createAdapter(src = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', options: Partial<EmbedAdapterOptions> = {}) {
  const videoEl = document.createElement('video')
  document.body.appendChild(videoEl)
  const adapter = createYoutubeAdapter(videoEl, { src, ...options })
  // Flushes ensureApiLoaded()'s loadScript().then() microtask (a no-op if a prior test already
  // reached isApiReady, since initYtPlayer then runs synchronously inside createYoutubeAdapter).
  await Promise.resolve()
  const player = players[players.length - 1]
  return { adapter, player, videoEl }
}

describe('ready-state queueing', () => {
  it('defers play() until the player is ready, then plays', async () => {
    const { adapter, player } = await createAdapter()
    const waiting = vi.fn()
    adapter.on('waiting', waiting)

    void adapter.play()
    expect(waiting).toHaveBeenCalledOnce()
    expect(player.state).toBeNull()

    player.events.onReady?.({ target: player })
    expect(player.state).toBe(PlayerState.PLAYING)
  })

  it('cues (rather than plays) the video once ready when autoplay was not requested', async () => {
    const { player } = await createAdapter()

    player.events.onReady?.({ target: player })

    expect(player.cuedVideoId).toBe('dQw4w9WgXcQ')
    expect(player.state).toBeNull()
  })

  it('plays immediately once ready when autoplay was requested', async () => {
    const { player } = await createAdapter(undefined, { autoplay: true })

    player.events.onReady?.({ target: player })

    expect(player.state).toBe(PlayerState.PLAYING)
  })
})

describe('platform-native ad detection', () => {
  it('fires adstart/adend as getPlayerResponse().adPlacements toggles', async () => {
    const { adapter, player } = await createAdapter()
    const adstart = vi.fn()
    const adend = vi.fn()
    adapter.on('adstart', adstart)
    adapter.on('adend', adend)

    player.playerResponse = { adPlacements: [{}] }
    player.playVideo()
    expect(adstart).toHaveBeenCalledOnce()

    player.playerResponse = { adPlacements: [] }
    player.pauseVideo()
    expect(adend).toHaveBeenCalledOnce()
  })
})

describe('paused()', () => {
  it('reflects the underlying IFrame state', async () => {
    const { adapter, player } = await createAdapter()
    expect(adapter.paused()).toBe(true)

    player.playVideo()
    expect(adapter.paused()).toBe(false)

    player.pauseVideo()
    expect(adapter.paused()).toBe(true)

    player.setState(PlayerState.BUFFERING)
    expect(adapter.paused()).toBe(false)
  })
})

describe('seeking while paused', () => {
  it('polls until the seek lands, re-pausing and firing seeked', async () => {
    const { adapter, player } = await createAdapter()
    player.events.onReady?.({ target: player })
    player.pauseVideo()

    const seeked = vi.fn()
    adapter.on('seeked', seeked)

    adapter.setCurrentTime(42)
    expect(player.currentTime).toBe(42)
    expect(seeked).not.toHaveBeenCalled()

    vi.advanceTimersByTime(250)

    expect(seeked).toHaveBeenCalledOnce()
    expect(player.state).toBe(PlayerState.PAUSED)
  })

  it('does not start a poll when already at the seek target', async () => {
    const { adapter, player } = await createAdapter()
    player.pauseVideo()
    player.currentTime = 10

    const seeked = vi.fn()
    adapter.on('seeked', seeked)

    adapter.setCurrentTime(10)
    vi.advanceTimersByTime(1000)

    expect(seeked).not.toHaveBeenCalled()
  })
})

describe('setMuted', () => {
  it('schedules a volumechange event shortly after toggling mute', async () => {
    const { adapter, player } = await createAdapter()
    player.events.onReady?.({ target: player })
    const volumechange = vi.fn()
    adapter.on('volumechange', volumechange)

    adapter.setMuted(true)
    expect(player.mutedState).toBe(true)
    expect(volumechange).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(volumechange).toHaveBeenCalledOnce()
  })
})

describe('setSrc', () => {
  it('loads the new video immediately once the player is already ready', async () => {
    const { adapter, player } = await createAdapter()
    player.events.onReady?.({ target: player })

    adapter.setSrc('https://www.youtube.com/watch?v=aaaaaaaaaaa')

    expect(player.loadedVideoId).toBe('aaaaaaaaaaa')
  })
})

describe('dispose', () => {
  it('stops and destroys the player and clears pending timers', async () => {
    const { adapter, player } = await createAdapter()
    player.pauseVideo()
    adapter.setCurrentTime(5) // starts the seek-catch-up interval
    adapter.setMuted(true) // schedules a volumechange timeout

    adapter.dispose()

    expect(player.destroyed).toBe(true)
    // Neither timer should fire post-dispose without throwing.
    vi.advanceTimersByTime(1000)
  })
})
