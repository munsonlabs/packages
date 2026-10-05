import type { CanvasSource } from 'mediabunny'
import { ClipError } from '@/utils/errors'

/** Seconds a clip waits on an encoder that holds frames and outputs nothing before it fails. */
export const STALL_TIMEOUT = 15

/**
 * Watches the video encoder for a silent stall: frames handed over, no encoded output, no error. An
 * H.264 encoder can do that (macOS's hardware encoder under load, seen in WebKit), and without a
 * watchdog the clip would wait forever. The clock runs only while reel is waiting on the encoder (an
 * `add` held by backpressure, or the flush after the last frame) with frames in it, and restarts at
 * every encoded packet, so a slow source (a decoder waiting on the network) never counts.
 */
export interface EncoderWatchdog {
  /** A frame handed to the encoder: settles as `work` does, or rejects with the stall. */
  frame<T>(work: Promise<T>): Promise<T>
  /** Settles as `work` does, or rejects with the stall; the clock runs meanwhile. */
  wait<T>(work: Promise<T>): Promise<T>
  /** Keeps the clock running (the encoder is flushing) until {@link EncoderWatchdog.dispose}. */
  hold(): void
  /** For the encoder's `onEncodedPacket`. */
  packet(): void
  /** Rejects with the stall's {@link ClipError}; never resolves. */
  readonly stalled: Promise<never>
  readonly hasStalled: boolean
  dispose(): void
}

export function createEncoderWatchdog(seconds: number = STALL_TIMEOUT): EncoderWatchdog {
  const limit = seconds * 1000
  let submitted = 0
  let encoded = 0
  let waiting = 0
  let lastPacket = 0
  let waitStart = 0
  let hasStalled = false
  let reject!: (error: ClipError) => void
  const stalled = new Promise<never>((_resolve, fail) => (reject = fail))
  // Nobody may be racing it when it fires (between frames); the racing waits still see it.
  stalled.catch(() => {})

  const check = () => {
    if (hasStalled || waiting === 0 || submitted <= encoded) {
      return
    }
    if (performance.now() - Math.max(lastPacket, waitStart) < limit) {
      return
    }
    hasStalled = true
    clearInterval(timer)
    reject(
      new ClipError(
        'encoder-stalled',
        `The video encoder stopped: it held ${submitted - encoded} frame(s) for ${seconds}s without producing any output or error, so the clip was abandoned. This is usually the device's hardware encoder being busy; try again.`,
      ),
    )
  }
  const timer = Number.isFinite(limit) && limit > 0 ? setInterval(check, Math.min(1000, limit / 4)) : undefined

  const begin = () => {
    if (waiting++ === 0) {
      waitStart = performance.now()
    }
  }
  const wait = <T>(work: Promise<T>): Promise<T> => {
    if (hasStalled) {
      return stalled
    }
    begin()
    return Promise.race([work, stalled]).finally(() => waiting--)
  }

  return {
    frame(work) {
      submitted++
      return wait(work)
    },
    wait,
    hold: begin,
    packet() {
      encoded++
      lastPacket = performance.now()
    },
    stalled,
    get hasStalled() {
      return hasStalled
    },
    dispose() {
      clearInterval(timer)
    },
  }
}

/**
 * Closes the WebCodecs encoder behind a `CanvasSource`. Mediabunny keeps it private, and once the output
 * is finalising `Output.cancel()` does nothing while the stalled `flush()` holds the output's lock, so
 * the encoder (and the frames it holds) would never be released. Closing it rejects that flush and lets
 * the output settle. A frame waiting on backpressure waits for a `dequeue` event, which closing fires
 * by spec only when the queue was not empty by the encoder's own count; one is sent here regardless, so
 * that frame is let go and closed. `watchdog.spec.ts` pins both against Mediabunny's internals.
 */
export function closeEncoder(source: CanvasSource): void {
  const encoder = (source as unknown as { _encoder?: { encoder?: VideoEncoder | null } })._encoder?.encoder
  if (encoder && encoder.state !== 'closed') {
    encoder.close()
    encoder.dispatchEvent(new Event('dequeue'))
  }
}
