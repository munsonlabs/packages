import { createReadStream, statSync } from 'node:fs'
import type { Plugin } from 'vite-plus'

export const PERF_MEDIA_PATH = '/__perf/media/clip.mp4'

/** Per-request server delay, standing in for the round trip a real CDN adds to every range request. */
export const PERF_LATENCY_MS = Number(process.env.PERF_LATENCY_MS ?? 80)

/**
 * Dev-server middleware that serves the flower.mp4 fixture with real HTTP range support and an
 * artificial per-request delay. The perf harness (tests/perf) points the player at it via
 * 127.0.0.1 rather than localhost so it is a genuinely different origin from the page - every
 * request then pays the delay, so the media round trip is a visible, fixed part of the result.
 * `route.fulfill` (used by tests/page) can't do this: it answers instantly and never touches a
 * socket.
 */
export function perfMediaServer(fixturePath: string): Plugin {
  return {
    name: 'perf-media-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith(PERF_MEDIA_PATH) || (req.method !== 'GET' && req.method !== 'HEAD')) return next()

        const { size, mtime } = statSync(fixturePath)
        if (process.env.PERF_DEBUG) {
          const { host: _h, connection: _c, 'user-agent': _ua, ...rest } = req.headers
          console.log(`[perf-media] ${req.method} ${JSON.stringify(rest)}`)
        }
        /** Vite's cors middleware adds `Vary: Origin` ahead of us; a CDN serving media wouldn't, and it changes cache-key matching. */
        res.removeHeader('Vary')
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '')
        let start = 0
        let end = size - 1
        if (range) {
          if (range[1]) start = Number(range[1])
          if (range[2]) end = Math.min(Number(range[2]), size - 1)
          else if (!range[1]) start = Math.max(size - Number(range[2]), 0)
        }

        /** Validators + a public max-age, as any CDN sends: without them Chrome treats each range response as uncacheable and its media cache can't share bytes between <video> elements. */
        const headers: Record<string, string> = {
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Content-Length': String(end - start + 1),
          'Cache-Control': 'public, max-age=31536000',
          ETag: `"${size}-${mtime.getTime()}"`,
          'Last-Modified': mtime.toUTCString(),
          /** Lets the page read transferSize on these cross-origin requests - 0 then genuinely means "served from cache". */
          'Timing-Allow-Origin': '*',
        }
        if (range) headers['Content-Range'] = `bytes ${start}-${end}/${size}`

        setTimeout(() => {
          res.writeHead(range ? 206 : 200, headers)
          if (req.method === 'HEAD') return res.end()
          createReadStream(fixturePath, { start, end }).pipe(res)
        }, PERF_LATENCY_MS)
      })
    },
  }
}
