import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { Output } from 'mediabunny'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { canClip, createClip } from '@/index'
import { changedFraction, edgeSharpness, engine, meanDifference, pixelsAt, playable, probe, scaled, trackFrames } from '@test/browser/helpers'

const captions = `WEBVTT

00:00:00.000 --> 00:00:02.000
A flower opens in the morning light

00:00:02.000 --> 00:00:05.100
Second caption, long enough that it has to wrap onto another line in a narrow vertical frame
`

let tracker: ReturnType<typeof trackFrames> | undefined
afterEach(() => {
  tracker?.restore()
  tracker = undefined
  vi.restoreAllMocks()
})

async function flower(): Promise<Blob> {
  return (await fetch(flowerUrl)).blob()
}

describe('createClip on flower.mp4 (960x540 H.264 + AAC, 5.06s)', () => {
  it('trims, crops to 9:16 and writes a valid MP4 with audio', async () => {
    tracker = trackFrames()
    const progress: number[] = []
    const started = performance.now()
    const clip = await createClip({
      source: await flower(),
      start: 1,
      end: 4,
      crop: { aspect: '9:16' },
      captions: { cues: captions },
      onProgress: (fraction) => progress.push(fraction),
    })
    const elapsed = performance.now() - started
    expect(tracker.open, 'VideoFrames left open').toBe(0)

    const probed = await probe(clip)
    console.log(`REEL_FLOWER ${engine()} ${Math.round(elapsed)}ms ${clip.size}B ${JSON.stringify(probed)}`)

    expect(clip.type).toBe('video/mp4')
    expect(probed.format).toBe('MP4')
    // The default output: 9:16 of 540p scaled up to 1080x1920.
    expect(probed.video).toMatchObject({ width: 1080, height: 1920 })
    expect(probed.video?.codec).toMatch(/^avc1\./)
    expect(probed.duration).toBeGreaterThan(3 - 0.15)
    expect(probed.duration).toBeLessThan(3 + 0.15)
    // flower.mp4's AAC is copied, so every engine keeps it, with or without an AAC encoder.
    expect(probed.audio?.codec).toBe('mp4a.40.2')

    expect(progress.length).toBeGreaterThan(1)
    expect(progress.at(-1)).toBe(1)
    for (let i = 1; i < progress.length; i++) {
      expect(progress[i]).toBeGreaterThanOrEqual(progress[i - 1])
    }

    const played = await playable(clip)
    expect(played.videoWidth).toBe(1080)
    expect(played.videoHeight).toBe(1920)
    expect(Math.abs(played.duration - 3)).toBeLessThan(0.15)
  })

  it('burns captions into the picture where a cue is showing, and nowhere else', async () => {
    const source = await flower()
    // size 0.08 of 540 = 43px text on an opaque box whose rows sit just above the 10% bottom margin.
    const style = { background: '#000', size: 0.08, position: 'bottom' as const, margin: 0.1 }
    const [withCaptions, without] = await Promise.all([
      createClip({ source, start: 0, end: 2.5, crop: { height: 540 }, captions: { cues: [{ start: 0.5, end: 1.5, text: 'BURNED IN' }], style } }),
      createClip({ source, start: 0, end: 2.5, crop: { height: 540 } }),
    ])

    const height = 540
    const lineHeight = Math.round(Math.round(height * 0.08) * 1.3)
    const bandBottom = height - Math.round(height * 0.1)
    const rows: [number, number] = [bandBottom - lineHeight + 8, bandBottom - 8]
    const captioned = await pixelsAt(withCaptions, 1)
    const plain = await pixelsAt(without, 1)
    const band = changedFraction(captioned, plain, ...rows)
    const top = changedFraction(captioned, plain, 0, Math.round(height * 0.6))
    const after = changedFraction(await pixelsAt(withCaptions, 2), await pixelsAt(without, 2), ...rows)
    console.log(`REEL_CAPTIONS ${engine()} changed band=${band.toFixed(3)} top=${top.toFixed(3)} afterCue=${after.toFixed(3)}`)

    expect(band).toBeGreaterThan(0.3)
    expect(top).toBeLessThan(0.01)
    expect(after).toBeLessThan(0.01)
  })

  it('paints captions at the output size, 1080x1920 by default, sharper than the native size scaled up', async () => {
    const source = await flower()
    const cues = [{ start: 0, end: 1, text: 'Painted at the size it is shown' }]
    const [native, sharp] = await Promise.all([
      createClip({ source, start: 0, end: 1, audio: false, crop: { height: 540 }, captions: { cues } }),
      createClip({ source, start: 0, end: 1, audio: false, captions: { cues } }),
    ])
    const big = await pixelsAt(sharp, 0.5)
    expect([big.width, big.height]).toEqual([1080, 1920])
    // The default look: 4.5% of the frame's height, the block's bottom 14% above the frame's bottom.
    const size = Math.round(1920 * 0.045)
    const bottom = 1920 - Math.round(1920 * 0.14)
    const band = { left: 0.05, top: (bottom - Math.round(size * 1.3) * 2) / 1920, right: 0.95, bottom: bottom / 1920 }
    const before = edgeSharpness(scaled(await pixelsAt(native, 0.5), big.width, big.height), band)
    const after = edgeSharpness(big, band)
    console.log(
      `REEL_SHARPNESS ${engine()} captions: 304x540 scaled up ${before.toFixed(0)}, 1080x1920 ${after.toFixed(0)} (${(after / before).toFixed(2)}x)`,
    )
    expect(after).toBeGreaterThan(before * 1.5)
  })

  it('scales a small source up to 1080x1920 by default, keeps a taller crop as it is, and takes an explicit height either way', async () => {
    const source = await flower()
    const sizes = async (crop: Parameters<typeof createClip>[0]['crop']) => {
      const probed = await probe(await createClip({ source, start: 0, end: 0.5, audio: false, crop }))
      return [probed.video?.width, probed.video?.height]
    }
    // 960x540: 9:16 is 304x540 of it, scaled up; 1:1 fits 1080x1080; the whole 16:9 frame fits 1920x1080.
    expect(await sizes({ aspect: '9:16' })).toEqual([1080, 1920])
    expect(await sizes({ aspect: '1:1' })).toEqual([1080, 1080])
    expect(await sizes({ aspect: 'source' })).toEqual([1920, 1080])
    expect(await sizes({ aspect: '9:16', height: 540 })).toEqual([304, 540])
    expect(await sizes({ aspect: '9:16', height: 1280 })).toEqual([720, 1280])
  })

  it('moves the crop window with focus', async () => {
    const source = await flower()
    const [left, right] = await Promise.all([
      createClip({ source, start: 0, end: 0.5, crop: { focus: 0 }, audio: false }),
      createClip({ source, start: 0, end: 0.5, crop: { focus: 1 }, audio: false }),
    ])
    const a = await pixelsAt(left, 0.1)
    const b = await pixelsAt(right, 0.1)
    expect(meanDifference(a, b, 0, a.height)).toBeGreaterThan(10)
    expect((await probe(left)).audio).toBeNull()
  })

  it('aborts mid-clip with the signal reason and leaves no frames open', async () => {
    tracker = trackFrames()
    const controller = new AbortController()
    const promise = createClip({
      source: await flower(),
      crop: { aspect: '9:16' },
      signal: controller.signal,
      onProgress: (fraction) => {
        if (fraction > 0.2) {
          controller.abort()
        }
      },
    })
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    expect(tracker.open, 'VideoFrames left open after abort').toBe(0)
  })

  it('rejects with the signal reason when aborted while the file is being finalised', async () => {
    tracker = trackFrames()
    const controller = new AbortController()
    const finalize = Output.prototype.finalize
    // The last window an abort can land in: every frame is in and the file is being written out.
    vi.spyOn(Output.prototype, 'finalize').mockImplementation(function (this: Output) {
      controller.abort()
      return finalize.call(this)
    })
    await expect(createClip({ source: await flower(), start: 0, end: 1, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
    expect(tracker.open, 'VideoFrames left open after abort').toBe(0)
  })

  it('rejects at once for an already aborted signal', async () => {
    const controller = new AbortController()
    controller.abort(new Error('stop'))
    await expect(createClip({ source: await flower(), signal: controller.signal })).rejects.toThrow('stop')
  })

  it('reads the source by URL', async () => {
    const result = await canClip(flowerUrl)
    expect(result.ok).toBe(true)
    const clip = await createClip({ source: flowerUrl, start: 2, end: 3 })
    expect(Math.abs((await probe(clip)).duration - 1)).toBeLessThan(0.15)
  })

  it('takes captions from a TextTrack, in the boxed look near the bottom', async () => {
    const video = document.createElement('video')
    const track = video.addTextTrack('captions', 'English', 'en')
    track.mode = 'hidden'
    track.addCue(new VTTCue(0, 1, 'From a <b>track</b>'))
    const source = await flower()
    const [captioned, plain] = await Promise.all([
      createClip({ source, start: 0, end: 1, crop: { height: 540 }, captions: { cues: track } }),
      createClip({ source, start: 0, end: 1, crop: { height: 540 } }),
    ])
    const [captionedFrame, plainFrame] = await Promise.all([pixelsAt(captioned, 0.5), pixelsAt(plain, 0.5)])
    // 24px text on 31px lines, the block's bottom 14% above the frame's bottom edge.
    const bottom = 540 - Math.round(540 * 0.14)
    expect(changedFraction(captionedFrame, plainFrame, bottom - 25, bottom - 6)).toBeGreaterThan(0.1)
    expect(changedFraction(captionedFrame, plainFrame, bottom + 16, 540)).toBeLessThan(0.002)
  })
})
