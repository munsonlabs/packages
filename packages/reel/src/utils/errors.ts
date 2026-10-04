import type { ClipBlocker } from '@/types'

export function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')
}

/**
 * Thrown (or returned by `canClip`) when a source cannot be clipped. `reason` is a stable code to
 * branch on; `message` is written for a developer reading the console.
 */
export class ClipError extends Error {
  readonly reason: ClipBlocker

  constructor(reason: ClipBlocker, message: string) {
    super(message)
    this.name = 'ClipError'
    this.reason = reason
  }
}
