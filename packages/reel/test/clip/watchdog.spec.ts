import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createEncoderWatchdog, STALL_TIMEOUT } from '@/clip/watchdog'
import { ClipError } from '@/utils/errors'

/** A promise that never settles: an encoder call that never returns. */
const never = () => new Promise<void>(() => {})

/** Whether `promise` has rejected after the clock moves on by `ms`. */
async function rejectedAfter(promise: Promise<unknown>, ms: number): Promise<unknown> {
  let result: unknown = null
  promise.catch((error: unknown) => (result = error))
  await vi.advanceTimersByTimeAsync(ms)
  return result
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createEncoderWatchdog', () => {
  it('defaults to 15 seconds', () => {
    expect(STALL_TIMEOUT).toBe(15)
  })

  it('rejects a frame the encoder holds without output for the timeout', async () => {
    const watchdog = createEncoderWatchdog(2)
    const frame = watchdog.frame(never())
    expect(await rejectedAfter(frame, 1500)).toBeNull()
    const error = await rejectedAfter(frame, 1000)
    expect(error).toBeInstanceOf(ClipError)
    expect(error).toMatchObject({ reason: 'encoder-stalled', message: expect.stringContaining('try again') })
    expect(watchdog.hasStalled).toBe(true)
    // Anything waited on afterwards fails at once.
    expect(await rejectedAfter(watchdog.wait(never()), 0)).toBe(error)
    watchdog.dispose()
  })

  it('restarts the clock at every encoded packet', async () => {
    const watchdog = createEncoderWatchdog(2)
    // Six frames in, five packets out: one is still held when the packets stop.
    const [frame, ...others] = Array.from({ length: 6 }, () => watchdog.frame(never()))
    others.forEach((other) => other.catch(() => {}))
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(1500)
      watchdog.packet()
    }
    expect(await rejectedAfter(frame, 1000)).toBeNull()
    expect(await rejectedAfter(frame, 1500)).toMatchObject({ reason: 'encoder-stalled' })
    watchdog.dispose()
  })

  it('never counts time spent outside the encoder, such as a slow source', async () => {
    const watchdog = createEncoderWatchdog(2)
    // A frame went in and the encoder is holding it (as encoders with lookahead do), but reel is
    // busy reading the next one from the network, not waiting on the encoder.
    await watchdog.frame(Promise.resolve())
    await vi.advanceTimersByTimeAsync(60_000)
    expect(watchdog.hasStalled).toBe(false)
    // Waiting on the encoder again starts a fresh clock.
    const next = watchdog.frame(never())
    expect(await rejectedAfter(next, 1500)).toBeNull()
    expect(await rejectedAfter(next, 1000)).toMatchObject({ reason: 'encoder-stalled' })
    watchdog.dispose()
  })

  it('does not fire once every frame has come out, however long the wait', async () => {
    const watchdog = createEncoderWatchdog(2)
    await watchdog.frame(Promise.resolve())
    watchdog.packet()
    // The output being written after the last packet.
    const finalize = watchdog.wait(never())
    watchdog.hold()
    expect(await rejectedAfter(finalize, 60_000)).toBeNull()
    watchdog.dispose()
  })

  it('times a flush from when it starts', async () => {
    const watchdog = createEncoderWatchdog(2)
    await watchdog.frame(Promise.resolve())
    await vi.advanceTimersByTimeAsync(10_000)
    watchdog.hold()
    expect(await rejectedAfter(watchdog.stalled, 1500)).toBeNull()
    expect(await rejectedAfter(watchdog.stalled, 1000)).toMatchObject({ reason: 'encoder-stalled' })
    watchdog.dispose()
  })

  it('never fires with an infinite timeout, nor after dispose', async () => {
    const forever = createEncoderWatchdog(Infinity)
    expect(await rejectedAfter(forever.frame(never()), 3_600_000)).toBeNull()
    forever.dispose()
    const disposed = createEncoderWatchdog(1)
    const frame = disposed.frame(never())
    disposed.dispose()
    expect(await rejectedAfter(frame, 60_000)).toBeNull()
  })
})
