import { test, expect, type Page } from '@playwright/test'

// Plain URL API rather than node:url - this tsconfig is the browser-oriented one shared with src/.
const FIXTURE = decodeURIComponent(new URL('../fixtures/flower.mp4', import.meta.url).pathname)

/** Any URL on this host is answered with the local fixture; it never actually resolves. */
const FIXTURE_URL = 'https://fixture.invalid/clip.mp4'

/**
 * Keeps the page offline apart from the dev server: every cross-origin request is aborted except
 * `.mp4`s, which are answered with the local fixture. The page is built to tolerate that (Prebid
 * is optional, embeds are iframes we never interact with), and it's what makes these tests
 * deterministic.
 */
async function isolateFromNetwork(page: Page): Promise<void> {
  await page.route(
    (url) => url.hostname !== 'localhost',
    (route) => (route.request().url().endsWith('.mp4') ? route.fulfill({ path: FIXTURE, contentType: 'video/mp4' }) : route.abort()),
  )
}

async function isPlaying(video: ReturnType<Page['locator']>): Promise<boolean> {
  return video.evaluate((v: HTMLVideoElement) => !v.paused && !v.ended)
}

test.beforeEach(async ({ page }) => {
  await isolateFromNetwork(page)
})

test('boots the showcase without runtime errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Showcase' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Videos' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pin When Out of View' }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Try Your Own' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Events/ })).toBeVisible()

  expect(errors).toEqual([])
})

test('with the stage on (default), a card plays through the VideoStage, which pins when scrolled away', async ({ page }) => {
  await page.goto('/')

  // Add a card via "Try Your Own" rather than using the showcase's own (CDN/iframe) entries.
  const tryYourOwn = page.locator('section.panel', { hasText: 'Try Your Own' })
  await tryYourOwn.scrollIntoViewIfNeeded()
  await tryYourOwn.getByPlaceholder('https://...').fill(FIXTURE_URL)
  await tryYourOwn.getByRole('button', { name: 'Preview' }).click()

  const card = tryYourOwn.locator('.custom-video-card')
  await expect(card).toBeVisible()

  // The card itself never mounts a player while a VideoStage exists - its click is dispatched to
  // the stage, which is the cross-panel wiring only a full-page test can see.
  await card.getByRole('button', { name: 'Play' }).click()
  await expect(card.locator('video.mlv-video')).toHaveCount(0)

  const stageVideo = page.locator('.stage video.mlv-video')
  await expect(stageVideo).toBeAttached()
  await expect.poll(() => isPlaying(stageVideo), { message: 'the stage video to start playing' }).toBe(true)

  // Cross-panel wiring: the stage's state-change reaches EventLogPopover's badge.
  await expect(page.getByRole('button', { name: /Events/ }).locator('.popover-btn__badge')).toHaveText(/^[1-9]\d*$/)

  // The stage sits at the top of the page; the card we clicked is far below it, so we're already
  // scrolled away from the stage - it should have pinned itself to the corner.
  await expect(page.locator('.stage--minified')).toBeVisible()

  await page.getByRole('button', { name: /Events/ }).click()
  await expect(page.locator('.log__entry .log__type--play').first()).toBeVisible()
})

test('with the stage off, an inline `pin` player pins to the corner when scrolled out of view and unpins on return', async ({ page }) => {
  // useDemoSettings reads this once at module load, so it has to be in place before the app boots.
  await page.addInitScript(() => localStorage.setItem('player:showStage', 'false'))
  await page.goto('/')

  const panel = page.locator('section.panel', { hasText: 'Pin When Out of View' }).first()
  await panel.scrollIntoViewIfNeeded()
  await panel.getByRole('button', { name: 'Play' }).click()

  const video = panel.locator('video.mlv-video')
  await expect(video).toBeAttached()
  await expect.poll(() => isPlaying(video), { message: 'the inline video to start playing' }).toBe(true)

  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
  await expect(panel.locator('.player--pinned')).toBeVisible()

  // Coming back unpins it, and it's the same player, still playing.
  await panel.scrollIntoViewIfNeeded()
  await expect(panel.locator('.player--pinned')).toHaveCount(0)
  expect(await isPlaying(video)).toBe(true)
})
