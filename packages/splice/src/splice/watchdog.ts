import type { CanvasSource } from 'mediabunny'
import { ERROR_ENCODER_STALLED, STALL_TIMEOUT } from '@/constants'
import type { EncoderWatchdog } from '@/types/internal'

/**
 * Watches for an H.264 encoder that takes frames and then just goes quiet, no output and no error.
 * macOS's hardware encoder does this under load, and without this the clip would hang forever. The
 * clock only runs while we're waiting on the encoder and resets on every packet, so a slow source
 * never looks like a stall.
 */
export function createEncoderWatchdog(): EncoderWatchdog {
  const limit = STALL_TIMEOUT * 1000
  let lastPacket = 0
  let hasStalled = false

  const wait = <T>(work: Promise<T>): Promise<T> => {
    const waitStart = performance.now()
    let timer: ReturnType<typeof setInterval> | undefined

    const stall = new Promise<never>((_, reject) => {
      timer = setInterval(() => {
        const idle = performance.now() - Math.max(lastPacket, waitStart)
        if (idle < limit) return
        hasStalled = true
        reject(new Error(ERROR_ENCODER_STALLED(STALL_TIMEOUT)))
      }, 1000)
    })

    return Promise.race([work, stall]).finally(() => clearInterval(timer))
  }

  return {
    wait,
    packet: () => {
      lastPacket = performance.now()
    },
    get hasStalled() {
      return hasStalled
    },
  }
}

/**
 * Closes the WebCodecs encoder inside a CanvasSource after a stall. Mediabunny keeps it private,
 * and a stalled flush holds the output's lock, so output.cancel() would never finish. Closing the
 * encoder rejects the flush, and the dequeue event frees a frame stuck waiting on backpressure.
 */
export function closeEncoder(videoSource: CanvasSource): void {
  const encoder = (videoSource as unknown as { _encoder?: { encoder?: VideoEncoder | null } })._encoder?.encoder
  if (!encoder || encoder.state === 'closed') return

  encoder.close()
  encoder.dispatchEvent(new Event('dequeue'))
}
