import { describe, expect, it } from 'vite-plus/test'
import rotated90Url from '@test/browser/media/rotated-90.mp4?url'
import rotated270Url from '@test/browser/media/rotated-270.mp4?url'
import { canClip, createClip, createStoryboard } from '@/index'
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

/** The quadrant colours of a decoded frame, read at the centre of each quarter. */
function quadrants(image: ImageData): string[] {
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
    const check = await canClip(url)
    expect(check).toMatchObject({ ok: true, info: { width: 480, height: 640 } })
    const played = await playable(await (await fetch(url)).blob())
    console.log(`REEL_ROTATED_SOURCE ${engine()} rotation=${rotation} plays ${played.videoWidth}x${played.videoHeight}`)
    expect([played.videoWidth, played.videoHeight]).toEqual([480, 640])
  })

  it('keeps the whole frame upright with aspect source, the turn baked into the pixels', async () => {
    const frames = trackFrames()
    let clip: Blob
    try {
      clip = await createClip({ source: url, start: 0.2, end: 1.2, crop: { aspect: 'source', height: 640 } })
      expect(frames.open, 'VideoFrames left open').toBe(0)
    } finally {
      frames.restore()
    }
    const probed = await probe(clip)
    expect(probed.video).toMatchObject({ width: 480, height: 640, rotation: 0 })
    expect(quadrants(await pixelsAt(clip, 0.5))).toEqual(['red', 'green', 'blue', 'yellow'])
    const played = await playable(clip)
    expect([played.videoWidth, played.videoHeight]).toEqual([480, 640])
  })

  it('crops 9:16 across the display width, moved by focus', async () => {
    const [left, right] = await Promise.all([
      createClip({ source: url, start: 0, end: 1, crop: { aspect: '9:16', focus: 0, height: 640 } }),
      createClip({ source: url, start: 0, end: 1, crop: { aspect: '9:16', focus: 1, height: 640 } }),
    ])
    for (const clip of [left, right]) {
      const probed = await probe(clip)
      expect(probed.video).toMatchObject({ width: 360, height: 640, rotation: 0 })
      const played = await playable(clip)
      console.log(`REEL_ROTATED_CLIP ${engine()} rotation=${rotation} plays ${played.videoWidth}x${played.videoHeight}`)
      expect([played.videoWidth, played.videoHeight]).toEqual([360, 640])
    }
    // The 480-wide display splits red|green at x=240. Focus 0 keeps x 0..360 (split at 240 in the
    // clip); focus 1 keeps x 120..480 (split at 120). Column 180 tells them apart; sideways video
    // would not have red over blue at all.
    const a = await pixelsAt(left, 0.5)
    const b = await pixelsAt(right, 0.5)
    expect([hue(colourAt(a, 180, 160)), hue(colourAt(a, 180, 480))]).toEqual(['red', 'blue'])
    expect([hue(colourAt(b, 180, 160)), hue(colourAt(b, 180, 480))]).toEqual(['green', 'yellow'])
    expect([hue(colourAt(a, 300, 160)), hue(colourAt(b, 60, 480))]).toEqual(['green', 'blue'])
  })

  it('burns captions in upright, as horizontal lines near the bottom', async () => {
    const style = { background: '#000', size: 0.06, position: 'bottom' as const, margin: 0.1 }
    const [captioned, plain] = await Promise.all([
      createClip({ source: url, start: 0, end: 1, crop: { height: 640 }, captions: { cues: [{ start: 0, end: 1, text: 'UPRIGHT' }], style } }),
      createClip({ source: url, start: 0, end: 1, crop: { height: 640 } }),
    ])
    const height = 640
    const lineHeight = Math.round(Math.round(height * 0.06) * 1.3)
    const bandBottom = height - Math.round(height * 0.1)
    const a = await pixelsAt(captioned, 0.5)
    const b = await pixelsAt(plain, 0.5)
    const band = changedFraction(a, b, bandBottom - lineHeight + 6, bandBottom - 6)
    const rest = changedFraction(a, b, 0, bandBottom - lineHeight - 4)
    console.log(`REEL_ROTATED_CAPTIONS ${engine()} rotation=${rotation} band=${band.toFixed(3)} rest=${rest.toFixed(3)}`)
    // A horizontal line of text on a black box changes a wide band of rows and nothing above it; a
    // sideways caption would be a tall narrow column instead.
    expect(band).toBeGreaterThan(0.2)
    expect(rest).toBeLessThan(0.01)
  })

  it('builds portrait storyboard tiles', async () => {
    const board = await createStoryboard({ source: url, interval: 1, tileWidth: 120 })
    expect(board.tileHeight).toBe(160)
    const bitmap = await createImageBitmap(board.image)
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()
    expect(quadrants(ctx.getImageData(0, 0, 120, 160))).toEqual(['red', 'green', 'blue', 'yellow'])
  })
})
