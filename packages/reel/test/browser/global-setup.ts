import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { crc32, deflateSync } from 'node:zlib'
import type { TestProject } from 'vite-plus/test/node'

declare module 'vitest' {
  export interface ProvidedContext {
    /**
     * Origin of a server on another port: `/red.png` without CORS headers, `/red-cors.png` with them;
     * `/captions.vtt` without, `/captions-cors.vtt` with them; `/missing-cors.vtt` is a 404 with them.
     */
    logoServer: string
  }
}

/** A `size` x `size` PNG of one opaque colour, built by hand so the tests need no image files. */
function solidPng(size: number, [r, g, b]: [number, number, number]): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([length, body, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 2 // truecolour
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => [r, g, b]).flat())])
  const pixels = Buffer.concat(Array.from({ length: size }, () => row))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/**
 * Starts a tiny server on a port of its own, so its images are cross-origin to the test page: the
 * one real way to see what a logo without CORS headers does to a clip in every engine.
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const red = solidPng(64, [255, 0, 0])
  const server: Server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname
    if (path === '/red.png' || path === '/red-cors.png') {
      const headers: Record<string, string> = { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' }
      if (path === '/red-cors.png') {
        headers['Access-Control-Allow-Origin'] = '*'
      }
      response.writeHead(200, headers)
      response.end(red)
      return
    }
    if (path === '/captions.vtt' || path === '/captions-cors.vtt') {
      const cors = path === '/captions-cors.vtt'
      const headers: Record<string, string> = { 'Content-Type': 'text/vtt', 'Cache-Control': 'no-store' }
      if (cors) {
        headers['Access-Control-Allow-Origin'] = '*'
      }
      response.writeHead(200, headers)
      response.end(cors ? 'WEBVTT\r\n\r\n00:00.000 --> 00:01.000\r\n<i>From another origin</i>\r\n' : 'WEBVTT\n\n00:00.000 --> 00:01.000\nNo CORS\n')
      return
    }
    // A 404 a cross-origin page can read: with CORS headers.
    response.writeHead(404, path === '/missing-cors.vtt' ? { 'Access-Control-Allow-Origin': '*' } : {})
    response.end()
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  project.provide('logoServer', `http://127.0.0.1:${port}`)
  return () => new Promise<void>((resolve) => server.close(() => resolve()))
}
