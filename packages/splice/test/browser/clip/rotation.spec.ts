import { describe, expect, it } from 'vite-plus/test'
import rotated90Url from '@test/browser/media/rotated-90.mp4?url'
import rotated270Url from '@test/browser/media/rotated-270.mp4?url'
import { canSplice, createSplice, createThumbnails } from '@/index'
import { changedFraction, colourAt, engine, hue, pixelsAt, playable, probe, trackFrames } from '@test/browser/helpers'

/**
 * Phones store upright video as landscape frames plus a rotation in the track header. These fixtures
 * (made by `scripts/make-fixture.mjs rotated`) are 640x480 frames with a 90 or 270 degree `tkhd`
 * matrix, displayed as 480x640 with red, green, blue and yellow quadrants (top-left, top-right,
 * bottom-left, bottom-right). Every crop must be planned and cut in that display orientation, and the
 * clip must carry the turn in its pixels, not in metadata, so captions drawn on it stay upright.
 */
const fixtures = [
  { rotation: 90, url: rotated90Url },
  { rotation: 270, url: rotated270Url },
] as const

/** The quadrant colours of a frame, read at the centre of each quarter. */
function readQuadrants(image: ImageData): string[] {
  const { width, height } = image
  return [
    hue(colourAt(image, width / 4, height / 4)),
    hue(colourAt(image, (width * 3) / 4, height / 4)),
    hue(colourAt(image, width / 4, (height * 3) / 4)),
    hue(colourAt(image, (width * 3) / 4, (height * 3) / 4)),
  ]
}

describe.each(fixtures)('a phone video rotated $rotation degrees', ({ rotation, url }) => {
  it('is reported, played and stored the way the fixture claims', async () => {
    const source = await probe(await (await fetch(url)).blob())
    expect(source.video).toMatchObject({ width: 480, height: 640, rotation })
    expect(await canSplice(url)).toMatchObject({ ok: true, info: { width: 480, height: 640 } })
    const played = await playable(await (await fetch(url)).blob())
    expect([played.videoWidth, played.videoHeight]).toEqual([480, 640])
  })

  it('keeps the whole frame upright, the turn baked into the pixels', async () => {
    const frames = trackFrames()
    const clip = await createSplice({ source: url, start: 0.2, end: 1.2, crop: { aspect: '3:4', height: 640 } }).finally(() => frames.restore())
    expect(frames.open, 'VideoFrames left open').toBe(0)

    expect((await probe(clip)).video).toMatchObject({ width: 480, height: 640, rotation: 0 })
    expect(readQuadrants(await pixelsAt(clip, 0.5))).toEqual(['red', 'green', 'blue', 'yellow'])
    const played = await playable(clip)
    expect([played.videoWidth, played.videoHeight]).toEqual([480, 640])
  })

  it('crops 9:16 across the display width, moved by focus', async () => {
    const [left, right] = await Promise.all([
      createSplice({ source: url, start: 0, end: 1, crop: { aspect: '9:16', focus: { x: 0 }, height: 640 } }),
      createSplice({ source: url, start: 0, end: 1, crop: { aspect: '9:16', focus: { x: 1 }, height: 640 } }),
    ])
    for (const clip of [left, right]) {
      expect((await probe(clip)).video).toMatchObject({ width: 360, height: 640, rotation: 0 })
      const played = await playable(clip)
      console.log(`SPLICE_ROTATED_CLIP ${engine()} rotation=${rotation} plays ${played.videoWidth}x${played.videoHeight}`)
      expect([played.videoWidth, played.videoHeight]).toEqual([360, 640])
    }
    // The 480-wide display splits red|green at x=240. Focus 0 keeps x 0..360 (split at 240 in the
    // clip); focus 1 keeps x 120..480 (split at 120). Sideways video wouldn't have red over blue at all.
    const a = await pixelsAt(left, 0.5)
    const b = await pixelsAt(right, 0.5)
    expect([hue(colourAt(a, 180, 160)), hue(colourAt(a, 180, 480))]).toEqual(['red', 'blue'])
    expect([hue(colourAt(b, 180, 160)), hue(colourAt(b, 180, 480))]).toEqual(['green', 'yellow'])
    expect([hue(colourAt(a, 300, 160)), hue(colourAt(b, 60, 480))]).toEqual(['green', 'blue'])
  })

  it('burns captions in upright, as horizontal lines near the bottom', async () => {
    const crop = { aspect: '3:4', height: 640 } as const
    const [captioned, plain] = await Promise.all([
      createSplice({ source: url, start: 0, end: 1, crop, captions: [{ start: 0, end: 1, text: 'UPRIGHT CAPTION' }] }),
      createSplice({ source: url, start: 0, end: 1, crop }),
    ])
    const a = await pixelsAt(captioned, 0.5)
    const b = await pixelsAt(plain, 0.5)
    // A horizontal line of text changes a band of rows near the bottom and nothing in the top half; a
    // sideways caption would be a tall narrow column instead.
    const band = changedFraction(a, b, Math.round(640 * 0.78), Math.round(640 * 0.86))
    const rest = changedFraction(a, b, 0, Math.round(640 * 0.5))
    console.log(`SPLICE_ROTATED_CAPTIONS ${engine()} rotation=${rotation} band=${band.toFixed(3)} rest=${rest.toFixed(3)}`)
    expect(band).toBeGreaterThan(0.05)
    expect(rest).toBeLessThan(0.01)
  })

  it('makes portrait thumbnails', async () => {
    const images: ImageData[] = []
    await createThumbnails({
      source: url,
      count: 1,
      width: 120,
      onThumbnail: (_index, image) => {
        const canvas = new OffscreenCanvas(120, 160)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(image, 0, 0, 120, 160)
        images.push(ctx.getImageData(0, 0, 120, 160))
      },
    })
    expect(images).toHaveLength(1)
    expect(readQuadrants(images[0])).toEqual(['red', 'green', 'blue', 'yellow'])
  })
})
