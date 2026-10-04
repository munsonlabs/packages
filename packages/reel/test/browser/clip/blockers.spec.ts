import { describe, expect, it } from 'vite-plus/test'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import hlsUrl from '@test/browser/media/hls/flower.m3u8?url'
import { canClip, createClip, ClipError } from '@/index'
import { engine, probe } from '@test/browser/helpers'

/**
 * Every way a source the player can show still cannot be clipped, each answered with a reason code
 * rather than a stack trace from deep inside a demuxer.
 */
describe('canClip blockers', () => {
  it('refuses embed page URLs', async () => {
    expect(await canClip('https://www.youtube.com/watch?v=aqz-KE-bpKQ')).toMatchObject({ ok: false, reason: 'embed' })
    expect(await canClip('https://vimeo.com/76979871')).toMatchObject({ ok: false, reason: 'embed' })
  })

  it('refuses DASH manifests', async () => {
    expect(await canClip('https://cdn.example.com/manifest.mpd')).toMatchObject({ ok: false, reason: 'dash' })
  })

  it('reports a URL it cannot fetch (how a CORS refusal looks too) as unreachable', async () => {
    const result = await canClip('http://localhost:9/missing.mp4')
    expect(result).toMatchObject({ ok: false, reason: 'unreachable' })
  })

  it('refuses a <video> fed by MediaSource (hls.js, dash.js)', async () => {
    const video = document.createElement('video')
    const MediaSourceCtor = (globalThis.MediaSource ?? (globalThis as any).ManagedMediaSource) as typeof MediaSource
    const mediaSource = new MediaSourceCtor()
    video.src = URL.createObjectURL(mediaSource)
    expect(await canClip(video)).toMatchObject({ ok: false, reason: 'mse' })
    URL.revokeObjectURL(video.src)
  })

  it('refuses a <video> playing a MediaStream', async () => {
    const canvas = document.createElement('canvas')
    canvas.getContext('2d')?.fillRect(0, 0, 1, 1)
    const video = document.createElement('video')
    const stream = canvas.captureStream()
    video.srcObject = stream
    expect(await canClip(video)).toMatchObject({ ok: false, reason: 'media-stream' })
    stream.getTracks().forEach((track) => track.stop())
  })

  it('refuses a <video> with MediaKeys attached (simulated: no key system is set up in tests)', async () => {
    const video = document.createElement('video')
    video.src = flowerUrl
    Object.defineProperty(video, 'mediaKeys', { value: {} })
    expect(await canClip(video)).toMatchObject({ ok: false, reason: 'drm' })
  })

  it('refuses bytes that are not a video', async () => {
    const result = await canClip(new Blob([new Uint8Array(4096).fill(7)]))
    expect(result).toMatchObject({ ok: false, reason: 'unsupported-container' })
  })

  it('throws the same reason from createClip', async () => {
    const error = await createClip({ source: 'https://youtu.be/aqz-KE-bpKQ' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ClipError)
    expect(error).toMatchObject({ reason: 'embed' })
  })
})

describe('sources that do work', () => {
  it('a plain <video> with a file src, via currentSrc', async () => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    const loaded = new Promise((resolve) => video.addEventListener('loadedmetadata', resolve, { once: true }))
    video.src = flowerUrl
    await loaded
    const result = await canClip(video)
    expect(result).toMatchObject({ ok: true, info: { width: 960, height: 540 } })
  })

  it('a <video> playing a blob: URL made from a File', async () => {
    const blob = await (await fetch(flowerUrl)).blob()
    const video = document.createElement('video')
    video.src = URL.createObjectURL(blob)
    expect(await canClip(video)).toMatchObject({ ok: true })
    URL.revokeObjectURL(video.src)
  })

  it('an HLS playlist read directly (not through MSE)', async () => {
    const result = await canClip(hlsUrl)
    console.log(`REEL_HLS ${engine()} canClip ${JSON.stringify(result)}`)
    expect(result.ok).toBe(true)
    const clip = await createClip({ source: hlsUrl, start: 1, end: 4 })
    const probed = await probe(clip)
    console.log(`REEL_HLS ${engine()} clip ${JSON.stringify(probed)}`)
    expect(Math.abs(probed.duration - 3)).toBeLessThan(0.15)
  })
})
