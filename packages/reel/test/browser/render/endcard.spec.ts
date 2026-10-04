import { describe, expect, it } from 'vite-plus/test'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { clipLink, createClip, type EndCardInfo } from '@/index'
import { changedFraction, colourAt, edgeSharpness, engine, pixelsAt, playable, probe, scaled, trackFrames } from '@test/browser/helpers'

const origin = { url: 'https://example.com/watch/flower?ref=feed', title: 'A flower opens', publisher: 'Example News' }

async function flower(): Promise<Blob> {
  return (await fetch(flowerUrl)).blob()
}

describe('end card', () => {
  it('adds the card after the clip', async () => {
    const frames = trackFrames()
    let clip: Blob
    try {
      clip = await createClip({ source: await flower(), start: 1, end: 3, origin, endCard: true })
      expect(frames.open, 'VideoFrames left open').toBe(0)
    } finally {
      frames.restore()
    }

    const probed = await probe(clip)
    console.log(`REEL_ENDCARD ${engine()} ${clip.size}B ${JSON.stringify(probed)}`)
    expect(probed.duration).toBeGreaterThan(4.5 - 0.15)
    expect(probed.duration).toBeLessThan(4.5 + 0.15)
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
      createClip({ source, start: 0, end: 0.5, origin, endCard, audio: false, crop: { height: 540 } }),
      createClip({ source, start: 0, end: 0.5, origin, endCard, audio: false }),
    ])
    // Well into the card, after its fade: publisher, title, call to action and address.
    const big = await pixelsAt(sharp, 1.3)
    expect([big.width, big.height]).toEqual([1080, 1920])
    // The 304x540 card as a phone shows it, scaled to the same 1080x1920 screen.
    const small = scaled(await pixelsAt(native, 1.3), big.width, big.height)
    const text = { left: 0.05, top: 0.25, right: 0.95, bottom: 0.75 }
    const before = edgeSharpness(small, text)
    const after = edgeSharpness(big, text)
    console.log(
      `REEL_SHARPNESS ${engine()} end card text: 304x540 scaled up ${before.toFixed(0)}, 1080x1920 ${after.toFixed(0)} (${(after / before).toFixed(2)}x)`,
    )
    expect(after).toBeGreaterThan(before * 1.5)
  })

  it('leaves the card silent: the audio ends with the clip', async () => {
    const clip = await createClip({ source: await flower(), start: 0, end: 2, origin, endCard: { duration: 1.5 } })
    const { ALL_FORMATS, BlobSource, Input } = await import('mediabunny')
    const input = new Input({ source: new BlobSource(clip), formats: ALL_FORMATS })
    try {
      const audio = await input.getPrimaryAudioTrack()
      const video = await input.getPrimaryVideoTrack()
      if (audio) {
        expect(await audio.computeDuration()).toBeLessThan(2 + 0.1)
      }
      expect(await video!.computeDuration()).toBeGreaterThan(3.5 - 0.1)
    } finally {
      input.dispose()
    }
  })

  it('uses a custom draw instead of the default, with resolved info', async () => {
    const calls: EndCardInfo[] = []
    const clip = await createClip({
      source: await flower(),
      start: 0,
      end: 1,
      origin,
      endCard: {
        duration: 1,
        title: 'Custom title',
        draw: (ctx, info) => {
          calls.push(info)
          ctx.fillStyle = '#ff00ff'
          ctx.fillRect(0, 0, info.width, info.height)
        },
      },
    })
    expect(calls.length).toBeGreaterThan(10)
    expect(calls[0]).toMatchObject({
      width: 1080,
      height: 1920,
      time: 0,
      duration: 1,
      title: 'Custom title',
      publisher: 'Example News',
      url: clipLink(origin, 0, 1),
      displayUrl: 'example.com/watch/flower',
    })
    expect(calls.at(-1)!.progress).toBeGreaterThan(0.9)
    const [r, g, b] = colourAt(await pixelsAt(clip, 1.5), 540, 960)
    expect(r).toBeGreaterThan(200)
    expect(g).toBeLessThan(60)
    expect(b).toBeGreaterThan(200)
  })

  it('draws a card without a link when there is no origin', async () => {
    let url: string | null | undefined
    const clip = await createClip({
      source: await flower(),
      start: 0,
      end: 1,
      endCard: { duration: 1, title: 'No origin', draw: (_ctx, info) => (url = info.url) },
    })
    expect(url).toBeNull()
    expect(Math.abs((await probe(clip)).duration - 2)).toBeLessThan(0.15)
  })
})

describe('watermark', () => {
  it('runs a strip along the top of every clip frame', async () => {
    const source = await flower()
    const [marked, plain] = await Promise.all([
      createClip({ source, start: 0, end: 1, crop: { height: 540 }, watermark: { text: 'example.com', background: '#000' } }),
      createClip({ source, start: 0, end: 1, crop: { height: 540 } }),
    ])
    const band = Math.round(Math.round(540 * 0.022) * 1.8)
    for (const time of [0.1, 0.9]) {
      const a = await pixelsAt(marked, time)
      const b = await pixelsAt(plain, time)
      expect(changedFraction(a, b, 2, band - 2)).toBeGreaterThan(0.5)
      expect(changedFraction(a, b, band + 4, a.height)).toBeLessThan(0.01)
    }
  })
})
