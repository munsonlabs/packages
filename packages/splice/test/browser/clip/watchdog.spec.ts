import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { canSplice, createSplice } from '@/index'
import { engine, probe, stallVideoEncoders, trackFrames } from '@test/browser/helpers'

/**
 * An H.264 encoder that takes frames and never outputs or errors (macOS's hardware encoder under
 * load) must fail the clip, not hang it. The stall is simulated (`stallVideoEncoders`) and the timeout
 * shortened to a second, so these are deterministic: the export rejects within the timeout, every
 * frame is closed and every encoder it made is closed.
 */
vi.mock('@/constants', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/constants')>()), STALL_TIMEOUT: 1 }))

let restore: Array<() => void> = []
afterEach(() => {
  restore.forEach((undo) => undo())
  restore = []
})

/**
 * The fixture, with Mediabunny's encoder probes answered before any encoder is made to stall: in
 * Firefox it probes by encoding a test frame, which a stalled encoder would never finish, and it
 * remembers each answer.
 */
async function loadSource(): Promise<Blob> {
  const blob = await (await fetch(flowerUrl)).blob()
  await canSplice(blob, { crop: { aspect: '9:16' } })
  return blob
}

describe('a stalled video encoder', () => {
  for (const mode of ['flush', 'queue'] as const) {
    it(`fails the clip when it ${mode === 'flush' ? 'never flushes' : 'never drains its queue'}`, { timeout: 60_000 }, async () => {
      const source = await loadSource()
      const frames = trackFrames()
      const stall = stallVideoEncoders(mode)
      restore.push(frames.restore, stall.restore)

      const started = performance.now()
      const error = await createSplice({ source, start: 0, end: 2, crop: { aspect: '9:16' }, endCard: {} }).then(
        () => null,
        (failure: unknown) => failure,
      )
      const elapsed = (performance.now() - started) / 1000
      console.log(`SPLICE_STALL ${engine()} | ${mode} | ${elapsed.toFixed(2)}s`)

      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain('stopped responding')
      // Noticed within a second or so of the timeout; the rest is the export's own work.
      expect(elapsed).toBeLessThan(1 + 1.5 + 8)
      expect(frames.open, 'VideoFrames left open').toBe(0)
      expect(stall.made.map(({ encoder }) => encoder.state)).toEqual(stall.made.map(() => 'closed'))
    })
  }

  it('leaves a working encoder alone, however short the timeout', { timeout: 60_000 }, async () => {
    const clip = await createSplice({ source: await loadSource(), start: 0, end: 2, crop: { aspect: '9:16' } })
    expect((await probe(clip)).video).toMatchObject({ width: 1080, height: 1920 })
  })
})
