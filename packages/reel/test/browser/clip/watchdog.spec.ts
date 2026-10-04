import { afterEach, describe, expect, it } from 'vite-plus/test'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { canEncodeVideo, QUALITY_HIGH } from 'mediabunny'
import { canClip, ClipError, createClip } from '@/index'
import { engine, probe, stallVideoEncoders, trackFrames } from '@test/browser/helpers'

/**
 * An H.264 encoder that takes frames and never outputs or errors (macOS's hardware encoder under
 * load) must fail the clip, not hang it. The stall is simulated (`stallVideoEncoders`), so these are
 * deterministic: the export rejects with `'encoder-stalled'` within the timeout (twice it, when the
 * software retry stalls as well), every frame is closed and every encoder it made is closed.
 */
const STALL = 1

let restore: Array<() => void> = []
afterEach(() => {
  restore.forEach((undo) => undo())
  restore = []
})

const softwareEncoder = () => canEncodeVideo('avc', { width: 1080, height: 1920, quality: QUALITY_HIGH, hardwareAcceleration: 'prefer-software' })

/**
 * The fixture, with Mediabunny's encoder probes answered before any encoder is made to stall: in
 * Firefox it probes by encoding a test frame, which a stalled encoder would never finish, and it
 * remembers each answer.
 */
async function source(): Promise<Blob> {
  const blob = await (await fetch(flowerUrl)).blob()
  await canClip(blob)
  await softwareEncoder()
  return blob
}

describe('a stalled video encoder', () => {
  for (const mode of ['flush', 'queue'] as const) {
    it(
      `fails the clip with encoder-stalled when it ${mode === 'flush' ? 'never flushes' : 'never drains its queue'}`,
      { timeout: 60_000 },
      async () => {
        const blob = await source()
        const frames = trackFrames()
        restore.push(() => frames.restore())
        const stall = stallVideoEncoders(mode)
        restore.push(() => stall.restore())
        const started = performance.now()
        const error = await createClip({ source: blob, start: 0, end: 2, endCard: true, stallTimeout: STALL }).then(
          () => null,
          (failure: unknown) => failure,
        )
        const elapsed = (performance.now() - started) / 1000
        const attempts = stall.made.filter((made) => made.stalled).length
        console.log(`REEL_STALL ${engine()} | ${mode} | ${elapsed.toFixed(2)}s | ${attempts} attempt(s)`)

        expect(error).toBeInstanceOf(ClipError)
        expect(error).toMatchObject({ reason: 'encoder-stalled', message: expect.stringContaining('try again') })
        // One attempt, plus the software retry where the browser has a software H.264 encoder.
        expect(attempts).toBe((await softwareEncoder()) ? 2 : 1)
        expect(stall.made[0].config?.hardwareAcceleration ?? 'no-preference').toBe('no-preference')
        // Each stall is noticed within a second or so of the timeout; the rest is the export's own work.
        expect(elapsed).toBeLessThan(attempts * (STALL + 1.5) + 8)
        expect(frames.open, 'VideoFrames left open').toBe(0)
        expect(stall.made.map(({ encoder }) => encoder.state)).toEqual(stall.made.map(() => 'closed'))
      },
    )
  }

  it('retries once with a software encoder where there is one', { timeout: 60_000 }, async () => {
    const blob = await source()
    const frames = trackFrames()
    restore.push(() => frames.restore())
    // Only the first (hardware-preferring) configuration stalls.
    const stall = stallVideoEncoders('flush', (config) => config.hardwareAcceleration !== 'prefer-software')
    restore.push(() => stall.restore())
    const result = await createClip({ source: blob, start: 0, end: 2, stallTimeout: STALL }).then(
      (clip) => ({ clip }),
      (error: unknown) => ({ error }),
    )
    const software = await softwareEncoder()
    console.log(`REEL_STALL ${engine()} | retry | software H.264 ${software ? 'available' : 'unavailable'}`)
    if (software) {
      expect('clip' in result && (await probe(result.clip)).video).toMatchObject({ width: 1080, height: 1920 })
      expect(stall.made.at(-1)?.config?.hardwareAcceleration).toBe('prefer-software')
    } else {
      expect('error' in result && result.error).toMatchObject({ reason: 'encoder-stalled' })
    }
    expect(frames.open, 'VideoFrames left open').toBe(0)
    expect(stall.made[0].encoder.state).toBe('closed')
  })

  it('leaves a working encoder alone, however short the timeout', { timeout: 60_000 }, async () => {
    const clip = await createClip({ source: await source(), start: 0, end: 2, stallTimeout: 0.5 })
    expect((await probe(clip)).video).toMatchObject({ width: 1080, height: 1920 })
  })

  it('rejects a stallTimeout that is not a positive number', async () => {
    const blob = await source()
    await expect(createClip({ source: blob, stallTimeout: 0 })).rejects.toThrow(RangeError)
    await expect(createClip({ source: blob, stallTimeout: Number.NaN })).rejects.toThrow(RangeError)
  })
})
