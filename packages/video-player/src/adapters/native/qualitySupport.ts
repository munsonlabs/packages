import type { QualityLevelInfo } from '@/types/playback'

export interface QualitySupport {
  supportsQuality(): boolean
  getQualityLevels(): QualityLevelInfo[]
  getCurrentQuality(): number | null
  isAutoQuality(): boolean
  setQuality(index: number | null): void
}

/** Normalizes hls.js and dash.js's differently-shaped quality APIs to a common surface. */
export interface QualityEngineAdapter {
  levels(): QualityLevelInfo[]
  isAuto(): boolean
  currentIndex(): number | null
  setIndex(index: number | null): void
}

/** getEngine() returns null for plain `<video>` sources and Safari's native HLS path, since neither has variant levels to expose. */
export function createQualitySupport(getEngine: () => QualityEngineAdapter | null): QualitySupport {
  function getQualityLevels(): QualityLevelInfo[] {
    return getEngine()?.levels() ?? []
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
