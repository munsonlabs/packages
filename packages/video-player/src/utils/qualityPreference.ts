import { readStorage, writeStorage } from '@/utils/storage'

export const STORAGE_QUALITY_PREFERENCE_KEY = 'player:quality'

/**
 * A height in pixels, or `null` for Auto. Heights travel between videos where a level index could
 * not: the ladder keeps one variant per height, and `setQuality` snaps to the nearest one on offer,
 * so 720 means "roughly 720p here" on a source that has no exact 720p rung.
 */
export type QualityPreference = number | null

/** `undefined` means the viewer has never chosen, which is what leaves the engine's own Auto alone on a first visit. */
export function getQualityPreference(): QualityPreference | undefined {
  try {
    const raw = readStorage(STORAGE_QUALITY_PREFERENCE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    if (parsed === null) return null
    return typeof parsed?.height === 'number' ? parsed.height : undefined
  } catch {
    return undefined
  }
}

export function saveQualityPreference(height: QualityPreference): void {
  writeStorage(STORAGE_QUALITY_PREFERENCE_KEY, JSON.stringify(height === null ? null : { height }))
}
