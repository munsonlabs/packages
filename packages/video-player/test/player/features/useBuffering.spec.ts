import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { withSetup } from '@test/withSetup'
import { useBuffering, type UseBufferingReturn } from '@/player/features/useBuffering'
import { createEmitter } from '@/utils/emitter'
import type { PlaybackAdapter } from '@/types/playback'
import type { StateChangeType } from '@/types/player'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup(fire: (type: StateChangeType) => void): UseBufferingReturn {
  return withSetup(() => useBuffering(fire)).result
}

function makeAdapter(): { adapter: PlaybackAdapter; emitter: ReturnType<typeof createEmitter> } {
  const emitter = createEmitter()
  return { adapter: { on: emitter.on, off: emitter.off } as unknown as PlaybackAdapter, emitter }
}

describe('waiting', () => {
  it('does not flip isBuffering until the spinner delay has elapsed', () => {
    const fire = vi.fn()
    const { isBuffering, attachPlayerEvents } = setup(fire)
    const { emitter } = makeAdapter()
    attachPlayerEvents({ on: emitter.on, off: emitter.off } as unknown as PlaybackAdapter)

    emitter.trigger('waiting')

    expect(isBuffering.value).toBe(false)
    expect(fire).not.toHaveBeenCalled()
  })

  it('flips isBuffering and fires bufferstart once the delay elapses', () => {
    const fire = vi.fn()
    const { isBuffering, attachPlayerEvents } = setup(fire)
    const { emitter } = makeAdapter()
    attachPlayerEvents({ on: emitter.on, off: emitter.off } as unknown as PlaybackAdapter)

    emitter.trigger('waiting')
    vi.advanceTimersByTime(500)

    expect(isBuffering.value).toBe(true)
    expect(fire).toHaveBeenCalledWith('bufferstart')
  })

  it('cancels a pending buffering timer if playback resumes before the delay elapses', () => {
    const fire = vi.fn()
    const { isBuffering, attachPlayerEvents } = setup(fire)
    const { emitter } = makeAdapter()
    attachPlayerEvents({ on: emitter.on, off: emitter.off } as unknown as PlaybackAdapter)

    emitter.trigger('waiting')
    emitter.trigger('playing')
    vi.advanceTimersByTime(500)

    expect(isBuffering.value).toBe(false)
    expect(fire).not.toHaveBeenCalledWith('bufferstart')
  })
})

describe('reset (via playing/canplay)', () => {
  it('clears isBuffering and fires bufferend once buffering has actually started', () => {
    const fire = vi.fn()
    const { isBuffering, attachPlayerEvents } = setup(fire)
    const { emitter } = makeAdapter()
    attachPlayerEvents({ on: emitter.on, off: emitter.off } as unknown as PlaybackAdapter)
    emitter.trigger('waiting')
    vi.advanceTimersByTime(500)

    emitter.trigger('playing')

    expect(isBuffering.value).toBe(false)
    expect(fire).toHaveBeenCalledWith('bufferend')
  })

  it('does not fire bufferend if buffering never actually started', () => {
    const fire = vi.fn()
    const { attachPlayerEvents } = setup(fire)
    const { emitter } = makeAdapter()
    attachPlayerEvents({ on: emitter.on, off: emitter.off } as unknown as PlaybackAdapter)

    emitter.trigger('canplay')

    expect(fire).not.toHaveBeenCalledWith('bufferend')
  })
})

describe('reset (manual)', () => {
  it('clears a pending buffering timer and any active buffering state', () => {
    const fire = vi.fn()
    const { isBuffering, attachPlayerEvents, reset } = setup(fire)
    const { emitter } = makeAdapter()
    attachPlayerEvents({ on: emitter.on, off: emitter.off } as unknown as PlaybackAdapter)
    emitter.trigger('waiting')
    vi.advanceTimersByTime(500)
    expect(isBuffering.value).toBe(true)

    reset()

    expect(isBuffering.value).toBe(false)
    expect(fire).toHaveBeenCalledWith('bufferend')
  })
})
