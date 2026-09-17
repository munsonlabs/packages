import { test, expect, type Page } from '@playwright/test'

async function isolateFromNetwork(page: Page): Promise<void> {
  await page.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort(),
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
  await expect(page.getByRole('heading', { name: 'Variations' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pin When Out of View' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Events/ })).toBeVisible()

  expect(errors).toEqual([])
})

test('with the stage on (default), a card plays through the VideoStage, which pins when scrolled away', async ({ page }) => {
  await page.goto('/')

  const card = page.locator('[data-variation="Plain clip"]')
  await card.scrollIntoViewIfNeeded()
  // With a VideoStage on the page a card's click is dispatched to the stage instead of mounting inline.
  await card.getByRole('button', { name: 'Play' }).click()
  await expect(card.locator('video.mlv-video')).toHaveCount(0)

  const stageVideo = page.locator('.stage video.mlv-video')
  await expect(stageVideo).toBeAttached()
  await expect.poll(() => isPlaying(stageVideo), { message: 'the stage video to start playing' }).toBe(true)

  await expect(page.getByRole('button', { name: /Events/ }).locator('.popover-btn__badge')).toHaveText(/^[1-9]\d*$/)

  await expect(page.locator('.stage--minified')).toBeVisible()

  await page.getByRole('button', { name: /Events/ }).click()
  await expect(page.locator('.log__entry .log__type--play').first()).toBeVisible()
})

test('with the stage off, an inline `pin` player pins to the corner when scrolled out of view and unpins on return', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('player:showStage', 'false'))
  await page.goto('/')

  const panel = page.locator('section.panel', { hasText: 'Pin When Out of View' })
  await panel.scrollIntoViewIfNeeded()
  await panel.getByRole('button', { name: 'Play' }).click()

  const video = panel.locator('video.mlv-video')
  await expect(video).toBeAttached()
  await expect.poll(() => isPlaying(video), { message: 'the inline video to start playing' }).toBe(true)

  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
  await expect(panel.locator('.player--pinned')).toBeVisible()

  await panel.scrollIntoViewIfNeeded()
  await expect(panel.locator('.player--pinned')).toHaveCount(0)
  expect(await isPlaying(video)).toBe(true)
})
