import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { ref } from 'vue'
import { useScrubber } from '@/composables/controls/useScrubber'
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
    const { onInput, onChange } = useScrubber(player)

    onInput(rangeEvent(40))
    expect(player.value.pause).toHaveBeenCalled()

    onChange(rangeEvent(40))
    expect(player.value.seek).toHaveBeenCalledWith(40)
    expect(player.value.play).toHaveBeenCalled()
  })

  it('still commits a tap after an earlier drag', () => {
    const player = ref(makePlayer())
    const { onInput, onChange, onTouchStart, onTouchEnd } = useScrubber(player)

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
    const { onInput, onChange, onTouchStart, onTouchEnd } = useScrubber(player)

    onTouchStart()
    onInput(rangeEvent(20))
    onChange(rangeEvent(20))
    onTouchEnd(rangeEvent(20) as unknown as TouchEvent)

    expect(player.value.seek).toHaveBeenCalledTimes(1)
  })

  it('commits a pending drag on touchend when change never fires', () => {
    const player = ref(makePlayer())
    const { onInput, onTouchStart, onTouchEnd, scrubbing } = useScrubber(player)

    onTouchStart()
    onInput(rangeEvent(55))
    onTouchEnd(rangeEvent(55) as unknown as TouchEvent)

    expect(player.value.seek).toHaveBeenCalledWith(55)
    expect(player.value.play).toHaveBeenCalled()
    vi.advanceTimersByTime(5000)
    expect(scrubbing.value).toBe(false)
  })

  it('restores playback when the gesture is cancelled', () => {
    const player = ref(makePlayer())
    const { onInput, onPointerCancel, scrubbing } = useScrubber(player)

    onInput(rangeEvent(80))
    onPointerCancel()

    expect(player.value.seek).not.toHaveBeenCalled()
    expect(player.value.play).toHaveBeenCalled()
    expect(scrubbing.value).toBe(false)
  })

  it('leaves a paused player paused after a seek', () => {
    const player = ref(makePlayer({ isPlaying: false }))
    const { onInput, onChange } = useScrubber(player)

    onInput(rangeEvent(10))
    onChange(rangeEvent(10))

    expect(player.value.play).not.toHaveBeenCalled()
  })
})
