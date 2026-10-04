import { describe, expect, it } from 'vite-plus/test'
import countUrl from '@test/browser/media/count-720p.mp4?url'
import { createClip } from '@/index'
import { engine, playable, probe, trackFrames } from '@test/browser/helpers'

/**
 * The "reasonable time" evidence: a 10 second clip out of a 1280x720 30fps H.264/AAC file, cropped
 * to 9:16 with captions on every frame. Each case logs a REEL_TIMING line; the assertions only check
 * the output is right, never the speed, so a slow runner reports a number rather than failing.
 */
const cues = Array.from({ length: 10 }, (_, i) => ({ start: 1 + i, end: 2 + i, text: `Caption number ${i + 1}, burned into every frame it covers` }))

const cases = [
  { name: '10s 720p -> 404x720 9:16 + captions (the native crop size)', height: 720, expected: [404, 720] },
  { name: '10s 720p -> 1080x1920 9:16 + captions (the default, upscaled)', height: undefined, expected: [1080, 1920] },
] as const

describe('timing', () => {
  for (const testCase of cases) {
    it(testCase.name, { timeout: 180_000 }, async () => {
      const source = await (await fetch(countUrl)).blob()
      const frames = trackFrames()
      try {
        const started = performance.now()
        const clip = await createClip({ source, start: 1, end: 11, crop: { aspect: '9:16', height: testCase.height }, captions: { cues } })
        const elapsed = performance.now() - started
        expect(frames.open, 'VideoFrames left open').toBe(0)
        frames.restore()

        const probed = await probe(clip)
        console.log(
          `REEL_TIMING ${engine()} | ${testCase.name} | ${(elapsed / 1000).toFixed(2)}s wall | ${(10 / (elapsed / 1000)).toFixed(2)}x realtime | ${(clip.size / 1e6).toFixed(2)}MB | ${probed.mimeType} | ${probed.duration.toFixed(3)}s`,
        )
        expect(probed.video).toMatchObject({ width: testCase.expected[0], height: testCase.expected[1] })
        expect(Math.abs(probed.duration - 10)).toBeLessThan(0.15)
        const played = await playable(clip)
        expect(played.videoHeight).toBe(testCase.expected[1])
      } finally {
        frames.restore()
      }
    })
  }
})
