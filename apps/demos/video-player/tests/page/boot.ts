/** Boots the real demo the way index.html does: an #app host, then main.ts. One boot per test file, since vitest keeps one page per file. */
export async function bootApp(): Promise<void> {
  // Chromium runs offline (resolver flag), so the panels that mount CDN clips log playback errors for the page's whole life.
  console.error = () => {}
  document.body.innerHTML = '<div id="app"></div>'
  await import('../../src/main.ts')
  await waitFor(() => [...document.querySelectorAll('h1')].some((h) => h.textContent?.trim() === 'Showcase'), 'the app to boot')
}

export function isPlaying(video: Element | null): boolean {
  const v = video as HTMLVideoElement | null
  return !!v && !v.paused && !v.ended
}

export async function waitFor(predicate: () => boolean, message: string, timeout = 10_000): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error(`Timed out waiting for: ${message}`)
    await new Promise((r) => setTimeout(r, 50))
  }
}

export function playButtonIndex(within: Element): number {
  const all = [...document.querySelectorAll('button[aria-label="Play"]')]
  return all.indexOf(within.querySelector('button[aria-label="Play"]')!)
}
