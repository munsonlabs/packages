import { describe, it, expect, vi } from 'vite-plus/test'
import { usePlaybackRate } from '@/composables/overlay/usePlaybackRate'
import type { PlayerHandle } from '@/types/player'
import { PLAYBACK_RATES } from '@/constants'

function makePlayer(overrides: Partial<PlayerHandle> = {}): PlayerHandle {
  return {
    currentPlaybackRate: 1,
    setPlaybackRate: vi.fn(),
    ...overrides,
  } as unknown as PlayerHandle
}

describe('usePlaybackRate', () => {
  it('cycles forward through PLAYBACK_RATES, wrapping back to the first', () => {
    const player = makePlayer({ currentPlaybackRate: PLAYBACK_RATES[0] })
    const { cycleRate } = usePlaybackRate(player)

    for (let i = 1; i < PLAYBACK_RATES.length; i++) {
      cycleRate()
      expect(player.setPlaybackRate).toHaveBeenLastCalledWith(PLAYBACK_RATES[i])
      player.currentPlaybackRate = PLAYBACK_RATES[i]
    }

    cycleRate()
    expect(player.setPlaybackRate).toHaveBeenLastCalledWith(PLAYBACK_RATES[0])
  })

  it('treats a rate not in PLAYBACK_RATES as index -1, wrapping to the first entry', () => {
    const player = makePlayer({ currentPlaybackRate: 3 })
    const { cycleRate } = usePlaybackRate(player)

    cycleRate()

    expect(player.setPlaybackRate).toHaveBeenCalledWith(PLAYBACK_RATES[0])
  })

  it('formats a rate with a trailing multiplication sign', () => {
    const player = makePlayer()
    const { fmtRate } = usePlaybackRate(player)

    expect(fmtRate(1.5)).toBe('1.5×')
  })
})
