export type PlaybackListener = (...args: unknown[]) => void

export interface Emitter {
  on(event: string | string[], listener: PlaybackListener): void
  off(event: string, listener: PlaybackListener): void
  trigger(event: string, ...args: unknown[]): void
  dispose(): void
}

export function createEmitter(): Emitter {
  const listeners = new Map<string, Set<PlaybackListener>>()

  function on(event: string | string[], listener: PlaybackListener): void {
    for (const name of Array.isArray(event) ? event : [event]) {
      if (!listeners.has(name)) listeners.set(name, new Set())
      listeners.get(name)?.add(listener)
    }
  }

  function off(event: string, listener: PlaybackListener): void {
    listeners.get(event)?.delete(listener)
  }

  function trigger(event: string, ...args: unknown[]): void {
    listeners.get(event)?.forEach((fn) => fn(...args))
  }

  function dispose(): void {
    listeners.clear()
  }

  return { on, off, trigger, dispose }
}
