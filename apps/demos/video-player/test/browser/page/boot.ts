import { page } from 'vite-plus/test/browser'
import type { Locator } from 'vite-plus/test/browser'

export async function bootApp(): Promise<void> {
  document.body.innerHTML = '<div id="app"></div>'
  await import('../../../src/main.ts')
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

export function playButton(within: Element): Locator {
  return page.elementLocator(within).getByRole('button', { name: /^Play\b/ })
}
