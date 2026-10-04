import { isHlsUrl, isMasterPlaylist } from '@/captions/hls'
import type { PlaylistCache } from '@/types'

/**
 * A playlist as fetched: its bytes and content type, and whether to keep it once read (a master, or a
 * media playlist that has ended); `null` when the response is not one to serve from memory at all.
 */
type Entry = { body: Uint8Array; contentType: string | null; keep: boolean } | null

/**
 * A response with the cached bytes from `bytes=<start>-[<end>]`, or all of them without a range:
 * `206` with `Content-Range`, as a server that honours ranges answers, so Mediabunny's `UrlSource`
 * learns the size and reads on as usual.
 */
function respond(entry: NonNullable<Entry>, range: string | null): Response {
  const headers = new Headers()
  if (entry.contentType) {
    headers.set('Content-Type', entry.contentType)
  }
  const size = entry.body.byteLength
  const match = range ? /^bytes=(\d+)-(\d*)$/.exec(range.trim()) : null
  if (!match) {
    headers.set('Content-Length', String(size))
    return new Response(entry.body.slice(), { status: 200, headers })
  }
  const start = Number(match[1])
  const end = Math.min(size - 1, match[2] ? Number(match[2]) : size - 1)
  if (start >= size || end < start) {
    headers.set('Content-Range', `bytes */${size}`)
    return new Response(null, { status: 416, headers })
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`)
  headers.set('Content-Length', String(end - start + 1))
  return new Response(entry.body.slice(start, end + 1), { status: 206, headers })
}

/**
 * A `fetch` that reads each `.m3u8` GET once, whole, and serves later requests (ranges included) from
 * memory; requests for a loading playlist share the fetch; everything else passes through. Kept: a
 * master until `clear()`, a media playlist only with `#EXT-X-ENDLIST` (live ones grow). Not kept: a
 * failed, non-OK or redirected response (a redirect moves the base segment URLs resolve against). `clear()`
 * aborts the shared fetch.
 */
export function createPlaylistCache(): PlaylistCache {
  let entries = new Map<string, Promise<Entry>>()
  let controller = new AbortController()

  async function read(url: string, signal: AbortSignal): Promise<Entry> {
    const response = await globalThis.fetch(url, { signal })
    if (!response.ok || response.redirected) {
      void response.body?.cancel().catch(() => {})
      return null
    }
    const body = new Uint8Array(await response.arrayBuffer())
    const text = new TextDecoder().decode(body)
    return { body, contentType: response.headers.get('Content-Type'), keep: isMasterPlaylist(text) || /#EXT-X-ENDLIST/.test(text) }
  }

  function load(url: string): Promise<Entry> {
    const own = entries
    const existing = own.get(url)
    if (existing) {
      return existing
    }
    const loading = read(url, controller.signal)
    own.set(url, loading)
    const forget = () => {
      if (own.get(url) === loading) own.delete(url)
    }
    loading.then((entry) => {
      if (!entry?.keep) forget()
    }, forget)
    return loading
  }

  const cachedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init)
    if (request.method !== 'GET' || !isHlsUrl(request.url)) {
      return globalThis.fetch(input, init)
    }
    const url = request.url.split('#')[0]
    const entry = await load(url)
    if (!entry) {
      return globalThis.fetch(input, init)
    }
    return respond(entry, request.headers.get('Range'))
  }

  return {
    fetch: cachedFetch as typeof fetch,
    clear() {
      controller.abort(new DOMException('The playlist cache was cleared.', 'AbortError'))
      controller = new AbortController()
      entries = new Map()
    },
  }
}
