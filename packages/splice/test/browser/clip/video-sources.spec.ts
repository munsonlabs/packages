import { afterEach, describe, expect, it } from 'vite-plus/test'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { canSplice, createSplice } from '@/index'
import { probe } from '@test/browser/helpers'

let cleanup: Array<() => void> = []
afterEach(() => {
  cleanup.forEach((undo) => undo())
  cleanup = []
})

function createVideo(): HTMLVideoElement {
  const video = document.createElement('video')
  video.muted = true
  document.body.append(video)
  cleanup.push(() => video.remove())
  return video
}

describe('a <video> source', () => {
  it('reads a file played from a blob: URL', async () => {
    const video = createVideo()
    const url = URL.createObjectURL(await (await fetch(flowerUrl)).blob())
    cleanup.push(() => URL.revokeObjectURL(url))
    video.src = url
    await new Promise((resolve) => video.addEventListener('loadedmetadata', resolve, { once: true }))

    const clip = await createSplice({ source: video, start: 0, end: 1, audio: false })
    expect(Math.abs((await probe(clip)).duration - 1)).toBeLessThan(0.15)
  })

  it('refuses a MediaSource, which has no file behind its blob: URL', async () => {
    const video = createVideo()
    const mediaSource = new MediaSource()
    const url = URL.createObjectURL(mediaSource)
    cleanup.push(() => URL.revokeObjectURL(url))
    video.src = url
    await new Promise((resolve) => mediaSource.addEventListener('sourceopen', resolve, { once: true }))

    await expect(createSplice({ source: video })).rejects.toThrow('MediaSource')
    expect(await canSplice(video)).toEqual({ ok: false, message: expect.stringContaining('Pass the stream’s URL') })
  })

  it('refuses a live MediaStream', async () => {
    const video = createVideo()
    const canvas = document.createElement('canvas')
    canvas.getContext('2d')!.fillRect(0, 0, 10, 10)
    const stream = canvas.captureStream()
    cleanup.push(() => stream.getTracks().forEach((track) => track.stop()))
    video.srcObject = stream

    await expect(createSplice({ source: video })).rejects.toThrow('MediaStream')
  })

  it('refuses encrypted media', async () => {
    const video = createVideo()
    video.src = flowerUrl
    // A real EME session needs a key system; what splice checks is that one is attached.
    Object.defineProperty(video, 'mediaKeys', { value: {} })

    await expect(createSplice({ source: video })).rejects.toThrow('encrypted')
  })
})
