import { describe, it, expect, vi } from 'vite-plus/test'
import { useQuality } from '@/composables/overlay/useQuality'
import type { PlayerContext } from '@/composables/player/playerContext'
import type { QualityLevelInfo } from '@/types/playback'

function makePlayer(overrides: Partial<PlayerContext> = {}): PlayerContext {
  return {
    qualityLevels: [] as QualityLevelInfo[],
    currentQualityIndex: null,
    isAutoQuality: true,
    setQuality: vi.fn(),
    ...overrides,
  } as unknown as PlayerContext
}

const LEVELS: QualityLevelInfo[] = [
  { index: 0, height: 480, bitrate: 800_000, label: '480p' },
  { index: 1, height: 1080, bitrate: 3_000_000, label: '1080p' },
]

describe('useQuality', () => {
  it('is a no-op when there are no quality levels', () => {
    const player = makePlayer()
    const { cycleQuality, currentQualityLabel } = useQuality(player)

    cycleQuality()

    expect(player.setQuality).not.toHaveBeenCalled()
    expect(currentQualityLabel()).toBe('Auto')
  })

  it('cycles from Auto to the highest level, down to the lowest, then back to Auto', () => {
    const player = makePlayer({ qualityLevels: LEVELS, isAutoQuality: true, currentQualityIndex: null })
    const { cycleQuality } = useQuality(player)

    cycleQuality()
    expect(player.setQuality).toHaveBeenLastCalledWith(1)

    player.isAutoQuality = false
    player.currentQualityIndex = 1
    cycleQuality()
    expect(player.setQuality).toHaveBeenLastCalledWith(0)

    player.currentQualityIndex = 0
    cycleQuality()
    expect(player.setQuality).toHaveBeenLastCalledWith(null)
  })

  it('reports Auto or the selected level label', () => {
    const player = makePlayer({ qualityLevels: LEVELS, isAutoQuality: false, currentQualityIndex: 0 })
    const { currentQualityLabel } = useQuality(player)

    expect(currentQualityLabel()).toBe('480p')

    player.isAutoQuality = true
    expect(currentQualityLabel()).toBe('Auto')
  })
})
