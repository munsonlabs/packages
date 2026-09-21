/**
 * Every localStorage access in the package goes through here. Reading *or* writing throws outright
 * in Safari private mode, in a sandboxed iframe without allow-same-origin, and wherever the viewer
 * has blocked site data - so an unguarded call takes down whatever called it, which for the audio
 * preference is a click handler and for the auto-advance preference is a component's setup.
 * Storage is a convenience here, never a source of truth: losing it degrades, it never breaks.
 */
export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable or full - the preference simply doesn't persist */
  }
}
