import { PLAYBACK_RATES } from '@/constants'
import type { PlayerHandle } from '@/types/player'

export interface UsePlaybackRateReturn {
  cycleRate: () => void
  fmtRate: (rate: number) => string
}

/** A plain factory (no Vue reactivity inside) — shared as-is by the public PlaybackRateButton control and internally by MoreMenu. */
export function usePlaybackRate(player: PlayerHandle): UsePlaybackRateReturn {
  function cycleRate(): void {
    const idx = PLAYBACK_RATES.indexOf(player.currentPlaybackRate)
    player.setPlaybackRate(PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length])
  }

  function fmtRate(rate: number): string {
    return `${rate}×`
  }

  return { cycleRate, fmtRate }
}
