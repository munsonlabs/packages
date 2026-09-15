import type { PlayerHandle } from '@/types/player'

export interface UseQualityReturn {
  cycleQuality: () => void
  currentQualityLabel: () => string
}

/** Cycles Auto → highest → ... → lowest → Auto. Levels come sorted ascending by height, so cycling down from Auto starts at the end. */
export function useQuality(player: PlayerHandle): UseQualityReturn {
  function cycleQuality(): void {
    const levels = player.qualityLevels
    if (!levels.length) return
    if (player.isAutoQuality) {
      player.setQuality(levels[levels.length - 1].index)
      return
    }
    const currentPos = levels.findIndex((l) => l.index === player.currentQualityIndex)
    player.setQuality(currentPos <= 0 ? null : levels[currentPos - 1].index)
  }

  function currentQualityLabel(): string {
    if (player.isAutoQuality) return 'Auto'
    return player.qualityLevels.find((l) => l.index === player.currentQualityIndex)?.label ?? 'Auto'
  }

  return { cycleQuality, currentQualityLabel }
}
