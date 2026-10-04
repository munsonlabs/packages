import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { createPlaylistCache } from '@/sources/playlists'
import { fetchText, listHlsRenditions } from '@/captions/hls'

const master =
  '#EXTM3U\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="s",LANGUAGE="en",NAME="English",URI="en.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=1\nlow.m3u8\n'
const vod = '#EXTM3U\n#EXT-X-TARGETDURATION:1\n#EXTINF:1,\nseg0.ts\n#EXT-X-ENDLIST\n'
const live = '#EXTM3U\n#EXT-X-TARGETDURATION:1\n#EXTINF:1,\nseg0.ts\n'

/** A fetch that answers from `files` (by path) and records every request. */
function server(files: Record<string, string>) {
  const requests: string[] = []
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    requests.push(new URL(url).pathname)
    const body = files[new URL(url).pathname]
    return body === undefined
      ? new Response('missing', { status: 404 })
      : new Response(body, { headers: { 'Content-Type': 'application/vnd.apple.mpegurl' } })
  })
  vi.stubGlobal('fetch', fetch)
  return { requests, count: (path: string) => requests.filter((request) => request === path).length }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createPlaylistCache', () => {
  it('fetches a master playlist once, sharing a fetch in flight', async () => {
    const log = server({ '/master.m3u8': master })
    const cache = createPlaylistCache()
    const [a, b] = await Promise.all([
      fetchText('https://cdn.test/master.m3u8', undefined, undefined, cache),
      listHlsRenditions('https://cdn.test/master.m3u8', undefined, cache),
    ])
    expect(a).toBe(master)
    expect(b).toHaveLength(1)
    expect(await fetchText('https://cdn.test/master.m3u8#x', undefined, undefined, cache)).toBe(master)
    expect(log.count('/master.m3u8')).toBe(1)
  })

  it('answers Range requests as a server that honours them would', async () => {
    server({ '/master.m3u8': master })
    const cache = createPlaylistCache()
    const whole = await cache.fetch('https://cdn.test/master.m3u8')
    expect(whole.status).toBe(200)
    expect(await whole.text()).toBe(master)
    const tail = await cache.fetch('https://cdn.test/master.m3u8', { headers: { Range: 'bytes=4-' } })
    expect(tail.status).toBe(206)
    expect(tail.headers.get('Content-Range')).toBe(`bytes 4-${master.length - 1}/${master.length}`)
    expect(tail.headers.get('Content-Type')).toBe('application/vnd.apple.mpegurl')
    expect(await tail.text()).toBe(master.slice(4))
    const middle = await cache.fetch(new Request('https://cdn.test/master.m3u8', { headers: { Range: 'bytes=1-6' } }))
    expect(await middle.text()).toBe(master.slice(1, 7))
    expect((await cache.fetch('https://cdn.test/master.m3u8', { headers: { Range: `bytes=${master.length}-` } })).status).toBe(416)
  })

  it('keeps a complete media playlist, but reads a live one afresh', async () => {
    const log = server({ '/vod.m3u8': vod, '/live.m3u8': live })
    const cache = createPlaylistCache()
    for (let i = 0; i < 3; i++) {
      await fetchText('https://cdn.test/vod.m3u8', undefined, undefined, cache)
      await fetchText('https://cdn.test/live.m3u8', undefined, undefined, cache)
    }
    expect(log.count('/vod.m3u8')).toBe(1)
    expect(log.count('/live.m3u8')).toBe(3)
  })

  it('passes segments, other files and non-GET requests through, and forgets failures', async () => {
    const log = server({ '/seg0.ts': 'data', '/master.m3u8': master })
    const cache = createPlaylistCache()
    await cache.fetch('https://cdn.test/seg0.ts')
    await cache.fetch('https://cdn.test/seg0.ts')
    await cache.fetch('https://cdn.test/master.m3u8', { method: 'HEAD' })
    expect(log.count('/seg0.ts')).toBe(2)
    expect(log.count('/master.m3u8')).toBe(1)
    expect((await cache.fetch('https://cdn.test/gone.m3u8')).status).toBe(404)
    expect((await cache.fetch('https://cdn.test/gone.m3u8')).status).toBe(404)
    // Each miss: the shared read, then the caller's own fetch for the real response.
    expect(log.count('/gone.m3u8')).toBe(4)
  })

  it('starts over after clear()', async () => {
    const log = server({ '/master.m3u8': master })
    const cache = createPlaylistCache()
    await fetchText('https://cdn.test/master.m3u8', undefined, undefined, cache)
    cache.clear()
    await fetchText('https://cdn.test/master.m3u8', undefined, undefined, cache)
    expect(log.count('/master.m3u8')).toBe(2)
  })
})
