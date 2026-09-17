import type { QualityLevelInfo } from '@/types/playback'

export interface QualitySupport {
  supportsQuality(): boolean
  getQualityLevels(): QualityLevelInfo[]
  getCurrentQuality(): number | null
  isAutoQuality(): boolean
  setQuality(index: number | null): void
}

export interface QualityEngineAdapter {
  levels(): QualityLevelInfo[]
  isAuto(): boolean
  currentIndex(): number | null
  setIndex(index: number | null): void
}

/** One entry per height - the highest-bitrate variant of each, ascending. Heightless variants are audio-only renditions. */
function toResolutionLadder(levels: QualityLevelInfo[]): QualityLevelInfo[] {
  const byHeight = new Map<number, QualityLevelInfo>()
  for (const level of levels) {
    if (!level.height) continue
    const seen = byHeight.get(level.height)
    if (!seen || level.bitrate > seen.bitrate) byHeight.set(level.height, level)
  }
  return [...byHeight.values()].sort((a, b) => a.height - b.height)
}

export function createQualitySupport(getEngine: () => QualityEngineAdapter | null): QualitySupport {
  function getQualityLevels(): QualityLevelInfo[] {
    return toResolutionLadder(getEngine()?.levels() ?? [])
  }

  function isAutoQuality(): boolean {
    return getEngine()?.isAuto() ?? true
  }

  function getCurrentQuality(): number | null {
    const engine = getEngine()
    if (!engine) return null
    return isAutoQuality() ? null : engine.currentIndex()
  }

  function setQuality(index: number | null): void {
    getEngine()?.setIndex(index)
  }

  return {
    supportsQuality: () => getQualityLevels().length > 0,
    getQualityLevels,
    getCurrentQuality,
    isAutoQuality,
    setQuality,
  }
}
