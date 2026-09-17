import { STORAGE_AUDIO_PREFERENCE_KEY, DEFAULT_AUDIO_PREFERENCE } from '@/constants'
import type { AudioPreference } from '@/types/playback'

export function getAudioPreference(): AudioPreference {
  try {
    const raw = localStorage.getItem(STORAGE_AUDIO_PREFERENCE_KEY)
    if (!raw) return DEFAULT_AUDIO_PREFERENCE
    const parsed = JSON.parse(raw)
    return {
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_AUDIO_PREFERENCE.muted,
      volume: typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_AUDIO_PREFERENCE.volume,
    }
  } catch {
    return DEFAULT_AUDIO_PREFERENCE
  }
}

function saveAudioPreference(pref: AudioPreference): void {
  localStorage.setItem(STORAGE_AUDIO_PREFERENCE_KEY, JSON.stringify(pref))
}

/** Deliberately in-memory, not persisted - browser autoplay-unmuted permission resets on every reload. */
let hasUnmutedGestureThisSession = false

function recordUnmuteGesture(): void {
  hasUnmutedGestureThisSession = true
}

export function hasUnmutedThisSession(): boolean {
  return hasUnmutedGestureThisSession
}

export function saveAndTrackAudioPreference(pref: AudioPreference): void {
  saveAudioPreference(pref)
  if (!pref.muted) recordUnmuteGesture()
}

/** A real gesture is exempt from the autoplay-with-sound policy, so it follows the stored preference; `fromGesture: false` leaves it to resolveInitialMuted. */
export function resolveGestureMuted(explicitMuted: boolean | undefined, fromGesture = true): boolean | undefined {
  if (explicitMuted !== undefined) return explicitMuted
  if (!fromGesture) return undefined
  const muted = getAudioPreference().muted
  if (!muted) recordUnmuteGesture()
  return muted
}
