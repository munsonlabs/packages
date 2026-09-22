import { readStorage, writeStorage } from '@/preferences/storage'

export const STORAGE_CAPTION_PREFERENCE_KEY = 'player:captions'

export interface CaptionPreference {
  enabled: boolean
  /**
   * The language of the track the viewer chose, never its index. Indices are per-video: track 0 is
   * English on one source and Spanish on the next, so remembering one would silently switch language.
   */
  language?: string
}

/** `null` means the viewer has never expressed a preference, which is what lets a `<track default>` stand on a first visit. */
export function getCaptionPreference(): CaptionPreference | null {
  try {
    const raw = readStorage(STORAGE_CAPTION_PREFERENCE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.enabled !== 'boolean') return null
    return { enabled: parsed.enabled, ...(typeof parsed.language === 'string' && { language: parsed.language }) }
  } catch {
    return null
  }
}

export function saveCaptionPreference(pref: CaptionPreference): void {
  writeStorage(STORAGE_CAPTION_PREFERENCE_KEY, JSON.stringify(pref))
}

/**
 * Which track a stored preference points at within one video's list, or `undefined` for "leave it
 * alone". Turning captions off travels everywhere, but turning them *on* only travels to a video
 * that actually offers that language - forcing some other language on the viewer because their own
 * is missing would be worse than leaving the source's own choice standing.
 */
export function resolvePreferredCaptionTrack(
  pref: CaptionPreference | null,
  tracks: ReadonlyArray<{ index: number; language: string }>,
): number | null | undefined {
  if (!pref) return undefined
  if (!pref.enabled) return null
  if (!pref.language) return undefined
  return tracks.find((track) => track.language === pref.language)?.index ?? undefined
}
