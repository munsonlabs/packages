import type { QualityLevelInfo } from '@/types/playback'

export interface QualitySupport {
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

  /**
   * The ladder keeps one variant per height, so the engine's own current index can name a variant
   * the ladder filtered out - a manifest with two bitrates at the same height is enough. Reported
   * raw, that index matched nothing in the published list: the label read "Auto" while quality was
   * manually pinned, and cycling reset to Auto instead of stepping down. Map it onto its height's
   * representative so the index a consumer reads is always one it can pass back to setQuality().
   */
  function getCurrentQuality(): number | null {
    const engine = getEngine()
    if (!engine) return null
    if (isAutoQuality()) return null

    const engineIndex = engine.currentIndex()
    if (engineIndex === null || engineIndex < 0) return null

    const ladder = getQualityLevels()
    if (ladder.some((level) => level.index === engineIndex)) return engineIndex

    const height = engine.levels().find((level) => level.index === engineIndex)?.height
    return ladder.find((level) => level.height === height)?.index ?? null
  }

  function setQuality(index: number | null): void {
    getEngine()?.setIndex(index)
  }

  return {
    getQualityLevels,
    getCurrentQuality,
    isAutoQuality,
    setQuality,
  }
}
