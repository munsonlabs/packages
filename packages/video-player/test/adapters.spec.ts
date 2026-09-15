import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import {
  getPlatform,
  resolvePlatform,
  resolveSource,
  createEmbedAdapter,
  registerMatcher,
  registerEmbedAdapter,
  registerSourceResolver,
  registerPlatform,
} from '@/adapters/index'

describe('getPlatform', () => {
  it('detects youtube.com URLs', () => {
    expect(getPlatform('https://www.youtube.com/watch?v=abc123')).toBe('youtube')
  })

  it('detects youtu.be short URLs', () => {
    expect(getPlatform('https://youtu.be/abc123')).toBe('youtube')
  })

  it('detects vimeo.com URLs', () => {
    expect(getPlatform('https://vimeo.com/123456')).toBe('vimeo')
  })

  it('detects player.vimeo.com URLs', () => {
    expect(getPlatform('https://player.vimeo.com/video/123456')).toBe('vimeo')
  })

  it('detects dailymotion.com URLs', () => {
    expect(getPlatform('https://www.dailymotion.com/video/x7tgad0')).toBe('dailymotion')
  })

  it('detects dai.ly short URLs', () => {
    expect(getPlatform('https://dai.ly/x7tgad0')).toBe('dailymotion')
  })

  it('detects cdn.jwplayer.com URLs', () => {
    expect(getPlatform('https://cdn.jwplayer.com/videos/abc.mp4')).toBe('jwplayer')
  })

  it('detects jwplayer:// protocol URLs', () => {
    expect(getPlatform('jwplayer://media-id')).toBe('jwplayer')
  })

  it('detects brightcove embed URLs', () => {
    expect(getPlatform('https://players.brightcove.net/123/abc_default/index.html?videoId=456')).toBe('brightcove')
  })

  it('falls back to html5 for plain MP4 URLs', () => {
    expect(getPlatform('https://example.com/video.mp4')).toBe('html5')
  })

  it('falls back to html5 for HLS URLs', () => {
    expect(getPlatform('https://example.com/stream.m3u8')).toBe('html5')
  })
})

describe('resolvePlatform', () => {
  it('is embed:true for youtube/vimeo/dailymotion', () => {
    expect(resolvePlatform('https://www.youtube.com/watch?v=abc')).toEqual({ key: 'youtube', embed: true })
    expect(resolvePlatform('https://vimeo.com/123456')).toEqual({ key: 'vimeo', embed: true })
    expect(resolvePlatform('https://www.dailymotion.com/video/x7tgad0')).toEqual({ key: 'dailymotion', embed: true })
  })

  it('is embed:false for jwplayer/brightcove/plain html5', () => {
    expect(resolvePlatform('https://cdn.jwplayer.com/videos/abc.mp4')).toEqual({ key: 'jwplayer', embed: false })
    expect(resolvePlatform('https://players.brightcove.net/123/abc_default/index.html?videoId=456')).toEqual({ key: 'brightcove', embed: false })
    expect(resolvePlatform('https://example.com/video.mp4')).toEqual({ key: 'html5', embed: false })
  })
})

describe('resolveSource', () => {
  it('passes plain html5 URLs through unresolved, inferring type from the extension', async () => {
    const result = await resolveSource('html5', 'https://example.com/video.mp4')
    expect(result).toEqual({ src: 'https://example.com/video.mp4', type: 'video/mp4' })
  })

  it('infers the HLS mime type for a plain .m3u8 URL', async () => {
    const result = await resolveSource('html5', 'https://example.com/stream.m3u8')
    expect(result).toEqual({ src: 'https://example.com/stream.m3u8', type: 'application/x-mpegURL' })
  })

  it('infers the DASH mime type for a plain .mpd URL', async () => {
    const result = await resolveSource('html5', 'https://example.com/stream.mpd')
    expect(result).toEqual({ src: 'https://example.com/stream.mpd', type: 'application/dash+xml' })
  })

  it('passes embed platform URLs through unresolved — the URL itself is the source', async () => {
    const result = await resolveSource('youtube', 'https://www.youtube.com/watch?v=abc')
    expect(result).toEqual({ src: 'https://www.youtube.com/watch?v=abc', type: undefined })
  })
})

describe('extensibility registry', () => {
  it('registerMatcher lets getPlatform/resolvePlatform recognize a new platform', () => {
    registerMatcher({ test: (src) => src.startsWith('acme://'), key: 'acme', embed: true })
    expect(getPlatform('acme://video-123')).toBe('acme')
    expect(resolvePlatform('acme://video-123')).toEqual({ key: 'acme', embed: true })
  })

  it('registerEmbedAdapter makes createEmbedAdapter return the registered factory', async () => {
    const fakeAdapter = { el: document.createElement('div') }
    registerEmbedAdapter('acme', () => fakeAdapter as never)
    expect(await createEmbedAdapter('acme', document.createElement('video'), { src: 'acme://video-123' })).toBe(fakeAdapter)
  })

  it('registerSourceResolver makes resolveSource use the registered resolver', async () => {
    registerSourceResolver('acme', (url) => ({ src: url.replace('acme://', 'https://cdn.acme.test/'), type: 'video/mp4' }))
    const result = await resolveSource('acme', 'acme://video-123')
    expect(result).toEqual({ src: 'https://cdn.acme.test/video-123', type: 'video/mp4' })
  })

  it('a key with no registered resolver still falls back to extension-based type inference', async () => {
    const result = await resolveSource('unregistered-key', 'https://example.com/video.mp4')
    expect(result).toEqual({ src: 'https://example.com/video.mp4', type: 'video/mp4' })
  })

  it('registerPlatform registers both the matcher and the embed adapter in one call', async () => {
    const fakeAdapter = { el: document.createElement('div') }
    registerPlatform({ key: 'acme-embed', test: (src) => src.startsWith('acme-embed://'), embed: true, createAdapter: () => fakeAdapter as never })
    expect(resolvePlatform('acme-embed://x')).toEqual({ key: 'acme-embed', embed: true })
    expect(await createEmbedAdapter('acme-embed', document.createElement('video'), { src: 'acme-embed://x' })).toBe(fakeAdapter)
  })

  it('registerPlatform registers both the matcher and the source resolver for a non-embed platform', async () => {
    registerPlatform({
      key: 'acme-source',
      test: (src) => src.startsWith('acme-source://'),
      embed: false,
      resolveSource: (url) => ({ src: url.replace('acme-source://', 'https://cdn.acme.test/'), type: 'video/mp4' }),
    })
    expect(resolvePlatform('acme-source://y')).toEqual({ key: 'acme-source', embed: false })
    expect(await resolveSource('acme-source', 'acme-source://y')).toEqual({ src: 'https://cdn.acme.test/y', type: 'video/mp4' })
  })

  it('registerPlatform with embed:false and no resolveSource still falls back to extension-based inference', async () => {
    registerPlatform({ key: 'acme-plain', test: (src) => src.startsWith('acme-plain://'), embed: false })
    expect(resolvePlatform('acme-plain://z.mp4')).toEqual({ key: 'acme-plain', embed: false })
    expect(await resolveSource('acme-plain', 'acme-plain://z.mp4')).toEqual({ src: 'acme-plain://z.mp4', type: 'video/mp4' })
  })
})

describe('built-in platform adapters are dynamically imported on first use', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('resolves brightcove.ts lazily through the registry rather than needing it pre-registered', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('players.brightcove.net'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ video_cloud: { policy_key: 'pk' } }) })
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ sources: [{ src: 'https://cdn.example.com/lazy.mp4', type: 'video/mp4' }] }),
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolveSource('brightcove', 'https://players.brightcove.net/lazy-acct/lazy-player_default/index.html?videoId=789')

    expect(result).toEqual({ src: 'https://cdn.example.com/lazy.mp4', type: 'video/mp4', poster: null, adTagUrl: null })
  })
})
