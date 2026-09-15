import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { resolveSource } from '@/adapters/sources/brightcove'

/**
 * brightcove.ts caches player config at module scope, keyed by accountId/playerId_embed, with
 * no reset hook — so every test needs its own unique account/player/embed combo, or it'll get a
 * stale cached result from an earlier test instead of actually hitting the mocked fetch.
 */
let idCounter = 0
function uniqueUrl(videoId = '456'): string {
  idCounter += 1
  return `https://players.brightcove.net/acct-${idCounter}/player-${idCounter}_default/index.html?videoId=${videoId}`
}

function mockFetch(playerConfig: unknown, playbackApi: unknown): void {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url.includes('players.brightcove.net')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(playerConfig) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(playbackApi) })
  })
  vi.stubGlobal('fetch', fetchMock)
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('resolveSource', () => {
  it('rejects a non-Brightcove URL', async () => {
    await expect(resolveSource('https://example.com/video.mp4')).rejects.toThrow(/invalid src/)
  })

  it('rejects an embed URL missing videoId', async () => {
    await expect(resolveSource('https://players.brightcove.net/123/abc_default/index.html')).rejects.toThrow(/invalid src/)
  })

  it('parses accountId/playerId/embed/videoId from the embed URL and resolves a playable source', async () => {
    mockFetch(
      { video_cloud: { policy_key: 'pk123' } },
      { sources: [{ src: 'https://cdn.example.com/video.mp4', type: 'video/mp4' }], poster: 'https://cdn.example.com/poster.jpg' },
    )
    const url = uniqueUrl()
    const [, accountId, playerEmbed] = new URL(url).pathname.split('/')

    const result = await resolveSource(url)

    expect(result).toEqual({
      src: 'https://cdn.example.com/video.mp4',
      type: 'video/mp4',
      poster: 'https://cdn.example.com/poster.jpg',
      adTagUrl: null,
    })
    expect(fetch).toHaveBeenCalledWith(`https://players.brightcove.net/${accountId}/${playerEmbed}/config.json`)
    expect(fetch).toHaveBeenCalledWith(`https://edge.api.brightcove.com/playback/v1/accounts/${accountId}/videos/456`, {
      headers: { Accept: 'application/json;pk=pk123' },
    })
  })

  it('extracts the ima3 ad tag URL from the player config plugins', async () => {
    mockFetch(
      {
        video_cloud: { policy_key: 'pk123' },
        plugins: [{ name: 'ima3', options: { serverUrl: 'https://ads.example.com/vast.xml' } }],
      },
      { sources: [{ src: 'https://cdn.example.com/video.mp4', type: 'video/mp4' }], poster: null },
    )

    const result = await resolveSource(uniqueUrl())

    expect(result.adTagUrl).toBe('https://ads.example.com/vast.xml')
  })

  it('extracts the ad tag URL from a custom-named plugin nested under imaOptions.serverUrl', async () => {
    mockFetch(
      {
        video_cloud: { policy_key: 'pk123' },
        plugins: [{ name: 'customAdWrapper', options: { imaOptions: { serverUrl: 'https://ads.example.com/vmap?iu={adUnit}' } } }],
      },
      { sources: [{ src: 'https://cdn.example.com/video.mp4', type: 'video/mp4' }], poster: null },
    )

    const result = await resolveSource(uniqueUrl())

    expect(result.adTagUrl).toBe('https://ads.example.com/vmap?iu={adUnit}')
  })

  it('throws when the player config has no policy_key and no override is given', async () => {
    mockFetch({ video_cloud: {} }, {})

    await expect(resolveSource(uniqueUrl())).rejects.toThrow(/policy_key/)
  })
})
