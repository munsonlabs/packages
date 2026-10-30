import { describe, expect, it } from 'vite-plus/test'
import { ALL_FORMATS, BlobSource, Input } from 'mediabunny'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { createSplice } from '@/index'
import { WATERMARK_SIZE } from '@/constants'
import { changedFraction, colourAt, edgeSharpness, engine, pixelsAt, playable, probe, scaled, trackFrames } from '@test/browser/helpers'

const origin = { url: 'https://example.com/watch/flower?ref=feed', title: 'A flower opens', publisher: 'Example News' }
const crop = { aspect: '9:16' } as const

async function flower(): Promise<Blob> {
  return (await fetch(flowerUrl)).blob()
}

describe('end card', () => {
  it('adds the card after the clip', async () => {
    const frames = trackFrames()
    const clip = await createSplice({ source: await flower(), start: 1, end: 3, crop, origin, endCard: {} }).finally(() => frames.restore())
    expect(frames.open, 'VideoFrames left open').toBe(0)

    const probed = await probe(clip)
    console.log(`SPLICE_ENDCARD ${engine()} ${clip.size}B ${JSON.stringify(probed)}`)
    expect(Math.abs(probed.duration - 4.5)).toBeLessThan(0.15)
    const played = await playable(clip)
    expect(Math.abs(played.duration - 4.5)).toBeLessThan(0.15)
    expect([played.videoWidth, played.videoHeight]).toEqual([1080, 1920])

    const during = await pixelsAt(clip, 1)
    const card = await pixelsAt(clip, 3.8)
    expect(changedFraction(during, card, 0, card.height)).toBeGreaterThan(0.5)
    // The default background is #10241a; a corner of the card shows it once the fade is done.
    const [r, g, b] = colourAt(card, 8, 8)
    expect(Math.abs(r - 0x10) + Math.abs(g - 0x24) + Math.abs(b - 0x1a)).toBeLessThan(40)
  })

  it('draws its text at the output size, much sharper than the native size shown full screen', async () => {
    const source = await flower()
    const endCard = { duration: 1, title: 'A flower opens in the morning light' }
    const [native, sharp] = await Promise.all([
      createSplice({ source, start: 0, end: 0.5, origin, endCard, audio: false, crop: { aspect: '9:16', height: 540 } }),
      createSplice({ source, start: 0, end: 0.5, origin, endCard, audio: false, crop }),
    ])
    // Well into the card, after its fade.
    const big = await pixelsAt(sharp, 1.3)
    expect([big.width, big.height]).toEqual([1080, 1920])
    const small = scaled(await pixelsAt(native, 1.3), big.width, big.height)
    const text = { left: 0.05, top: 0.25, right: 0.95, bottom: 0.75 }
    const before = edgeSharpness(small, text)
    const after = edgeSharpness(big, text)
    console.log(`SPLICE_SHARPNESS ${engine()} end card text: 304x540 scaled up ${before.toFixed(0)}, 1080x1920 ${after.toFixed(0)}`)
    expect(after).toBeGreaterThan(before * 1.5)
  })

  it('leaves the card silent: the audio ends with the clip', async () => {
    const clip = await createSplice({ source: await flower(), start: 0, end: 2, crop, origin, endCard: { duration: 1.5 } })
    const input = new Input({ source: new BlobSource(clip), formats: ALL_FORMATS })
    const audio = await input.getPrimaryAudioTrack()
    const video = await input.getPrimaryVideoTrack()
    expect(await audio!.computeDuration()).toBeLessThan(2 + 0.1)
    expect(await video!.computeDuration()).toBeGreaterThan(3.5 - 0.1)
    input.dispose()
  })

  it('draws a card without an origin', async () => {
    const clip = await createSplice({ source: await flower(), start: 0, end: 1, crop, endCard: { duration: 1, title: 'No origin' } })
    expect(Math.abs((await probe(clip)).duration - 2)).toBeLessThan(0.15)
  })
})

describe('watermark', () => {
  it('runs a band along the top of every clip frame', async () => {
    const source = await flower()
    const small = { aspect: '16:9', height: 540 } as const
    const [marked, plain] = await Promise.all([
      createSplice({ source, start: 0, end: 1, crop: small, watermark: { text: 'example.com' } }),
      createSplice({ source, start: 0, end: 1, crop: small }),
    ])
    const band = Math.round(Math.round(540 * WATERMARK_SIZE) * 1.8)
    for (const time of [0.1, 0.9]) {
      const a = await pixelsAt(marked, time)
      const b = await pixelsAt(plain, time)
      expect(changedFraction(a, b, 2, band - 2, 30)).toBeGreaterThan(0.5)
      expect(changedFraction(a, b, band + 4, a.height)).toBeLessThan(0.01)
    }
  })
})
