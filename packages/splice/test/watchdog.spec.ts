import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { closeEncoder, createEncoderWatchdog } from '@/splice/watchdog'
import { STALL_TIMEOUT } from '@/constants'
import type { CanvasSource } from 'mediabunny'

/** A promise that never settles: an encoder call that never returns. */
const never = () => new Promise<void>(() => {})

/** What `promise` has rejected with after the clock moves on by `ms`, or `null`. */
async function rejectedAfter(promise: Promise<unknown>, ms: number): Promise<unknown> {
  let result: unknown = null
  promise.catch((error: unknown) => (result = error))
  await vi.advanceTimersByTimeAsync(ms)
  return result
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance', 'Date'] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createEncoderWatchdog', () => {
  it('waits 15 seconds', () => {
    expect(STALL_TIMEOUT).toBe(15)
  })

  it('rejects work the encoder holds without output for the timeout', async () => {
    const watchdog = createEncoderWatchdog()
    const work = watchdog.wait(never())

    expect(await rejectedAfter(work, 14_000)).toBeNull()
    expect(watchdog.hasStalled).toBe(false)

    const error = await rejectedAfter(work, 2_000)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('stopped responding for 15s')
    expect(watchdog.hasStalled).toBe(true)
  })

  it('restarts the clock at every encoded packet', async () => {
    const watchdog = createEncoderWatchdog()
    const work = watchdog.wait(never())

    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(10_000)
      watchdog.packet()
    }
    expect(await rejectedAfter(work, 10_000)).toBeNull()
    expect(await rejectedAfter(work, 6_000)).toBeInstanceOf(Error)
  })

  it('never counts time spent outside the encoder, such as a slow source', async () => {
    const watchdog = createEncoderWatchdog()
    await watchdog.wait(Promise.resolve())
    await vi.advanceTimersByTimeAsync(60_000)

    // Waiting on the encoder again starts a fresh clock.
    const next = watchdog.wait(never())
    expect(await rejectedAfter(next, 14_000)).toBeNull()
    expect(await rejectedAfter(next, 2_000)).toBeInstanceOf(Error)
  })

  it('lets work that settles in time through, and stops its clock', async () => {
    const watchdog = createEncoderWatchdog()
    await expect(watchdog.wait(Promise.resolve('done'))).resolves.toBe('done')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(watchdog.hasStalled).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('closeEncoder', () => {
  it('closes the encoder behind a CanvasSource and lets go of a frame waiting on it', () => {
    const encoder = Object.assign(new EventTarget(), { state: 'configured', close: vi.fn() })
    const dequeued = vi.fn()
    encoder.addEventListener('dequeue', dequeued)

    closeEncoder({ _encoder: { encoder } } as unknown as CanvasSource)

    expect(encoder.close).toHaveBeenCalledOnce()
    expect(dequeued).toHaveBeenCalledOnce()
  })

  it('leaves a closed or missing encoder alone', () => {
    const encoder = Object.assign(new EventTarget(), { state: 'closed', close: vi.fn() })
    closeEncoder({ _encoder: { encoder } } as unknown as CanvasSource)
    closeEncoder({} as unknown as CanvasSource)
    expect(encoder.close).not.toHaveBeenCalled()
  })
})
