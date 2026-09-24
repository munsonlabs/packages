import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { ref } from 'vue'
import type { Ref } from 'vue'
import { useScrubber } from '@/ui/controls/useScrubber'
import { withSetup } from '../../withSetup'
import type { PlayerHandle } from '@/types/player'

function makePlayer(overrides: Partial<PlayerHandle> = {}) {
  return {
    duration: 100,
    currentTime: 0,
    isPlaying: true,
    bufferedDisplay: 0,
    seek: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
    ...overrides,
  } as unknown as PlayerHandle
}

function scrubber(player: Ref<PlayerHandle>) {
  const { result, wrapper } = withSetup(() => useScrubber(player))
  return { ...result, wrapper }
}

function rangeEvent(value: number): Event {
  const input = document.createElement('input')
  input.type = 'range'
  input.value = String(value)
  return { target: input } as unknown as Event
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useScrubber', () => {
  it('pauses on drag and seeks on change', () => {
    const player = ref(makePlayer())
    const { onInput, onChange } = scrubber(player)

    onInput(rangeEvent(40))
    expect(player.value.pause).toHaveBeenCalled()

    onChange(rangeEvent(40))
    expect(player.value.seek).toHaveBeenCalledWith(40)
    expect(player.value.play).toHaveBeenCalled()
  })

  it('still commits a tap after an earlier drag', () => {
    const player = ref(makePlayer())
    const { onInput, onChange, onTouchStart, onTouchEnd } = scrubber(player)

    onTouchStart()
    onInput(rangeEvent(30))
    onChange(rangeEvent(30))
    onTouchEnd(rangeEvent(30) as unknown as TouchEvent)
    vi.mocked(player.value.seek).mockClear()

    onTouchStart()
    onTouchEnd(rangeEvent(70) as unknown as TouchEvent)

    expect(player.value.seek).toHaveBeenCalledWith(70)
  })

  it('does not seek twice when change already committed the gesture', () => {
    const player = ref(makePlayer())
    const { onInput, onChange, onTouchStart, onTouchEnd } = scrubber(player)

    onTouchStart()
    onInput(rangeEvent(20))
    onChange(rangeEvent(20))
    onTouchEnd(rangeEvent(20) as unknown as TouchEvent)

    expect(player.value.seek).toHaveBeenCalledTimes(1)
  })

  it('commits a pending drag on touchend when change never fires', () => {
    const player = ref(makePlayer())
    const { onInput, onTouchStart, onTouchEnd, scrubbing } = scrubber(player)

    onTouchStart()
    onInput(rangeEvent(55))
    onTouchEnd(rangeEvent(55) as unknown as TouchEvent)

    expect(player.value.seek).toHaveBeenCalledWith(55)
    expect(player.value.play).toHaveBeenCalled()
    vi.advanceTimersByTime(5000)
    expect(scrubbing.value).toBe(false)
  })

  it('does not start a paused video when a tap follows an earlier drag', () => {
    const player = ref(makePlayer())
    const { onInput, onChange, onTouchStart, onTouchEnd } = scrubber(player)

    onTouchStart()
    onInput(rangeEvent(20))
    onChange(rangeEvent(20))
    onTouchEnd(rangeEvent(20) as unknown as TouchEvent)

    vi.mocked(player.value.play).mockClear()
    Object.assign(player.value, { isPlaying: false })

    onTouchStart()
    onTouchEnd(rangeEvent(70) as unknown as TouchEvent)

    expect(player.value.seek).toHaveBeenCalledWith(70)
    expect(player.value.play).not.toHaveBeenCalled()
  })

  it('resumes a playing video after a tap that never fired input', () => {
    const player = ref(makePlayer())
    const { onTouchStart, onTouchEnd } = scrubber(player)

    onTouchStart()
    onTouchEnd(rangeEvent(65) as unknown as TouchEvent)

    expect(player.value.pause).toHaveBeenCalled()
    expect(player.value.seek).toHaveBeenCalledWith(65)
    expect(player.value.play).toHaveBeenCalled()
  })

  it('leaves a paused video paused after a tap that never fired input', () => {
    const player = ref(makePlayer({ isPlaying: false }))
    const { onTouchStart, onTouchEnd } = scrubber(player)

    onTouchStart()
    onTouchEnd(rangeEvent(65) as unknown as TouchEvent)

    expect(player.value.seek).toHaveBeenCalledWith(65)
    expect(player.value.play).not.toHaveBeenCalled()
  })

  it('restores playback when the gesture is cancelled', () => {
    const player = ref(makePlayer())
    const { onInput, onPointerCancel, scrubbing } = scrubber(player)

    onInput(rangeEvent(80))
    onPointerCancel()

    expect(player.value.seek).not.toHaveBeenCalled()
    expect(player.value.play).toHaveBeenCalled()
    expect(scrubbing.value).toBe(false)
  })

  it('drops a pending catch-up timer when the component goes away', () => {
    const player = ref(makePlayer())
    const { onInput, onChange, scrubbing, wrapper } = scrubber(player)

    onInput(rangeEvent(45))
    onChange(rangeEvent(45))
    expect(scrubbing.value).toBe(true)

    wrapper.unmount()

    expect(scrubbing.value).toBe(false)
    vi.advanceTimersByTime(10_000)
    expect(player.value.seek).toHaveBeenCalledTimes(1)
  })

  it('leaves a paused player paused after a seek', () => {
    const player = ref(makePlayer({ isPlaying: false }))
    const { onInput, onChange } = scrubber(player)

    onInput(rangeEvent(10))
    onChange(rangeEvent(10))

    expect(player.value.play).not.toHaveBeenCalled()
  })
})
