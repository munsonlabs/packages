import { describe, it, expect, beforeAll } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'
import { bootApp, isPlaying, playButtonIndex, waitFor } from './boot'

beforeAll(bootApp)

describe('showcase (stage on)', () => {
  it('boots with every panel present', async () => {
    for (const name of ['Videos', 'Variations', 'Pin When Out of View']) await expect.element(page.getByRole('heading', { name })).toBeVisible()
    await expect.element(page.getByRole('button', { name: /Events/ })).toBeVisible()
  })

  it('a card plays through the VideoStage, which pins when scrolled away, and the event log sees it', async () => {
    const card = document.querySelector<HTMLElement>('[data-variation="Plain clip"]')!
    card.scrollIntoView()
    await page.getByRole('button', { name: 'Play' }).nth(playButtonIndex(card)).click()

    expect(card.querySelector('video.mlv-video')).toBeNull()
    await waitFor(() => isPlaying(document.querySelector('.stage video.mlv-video')), 'the stage video to start playing')
    await waitFor(() => /^[1-9]\d*$/.test(document.querySelector('.popover-btn__badge')?.textContent ?? ''), 'the Events badge to count')
    await waitFor(() => !!document.querySelector('.stage--minified'), 'the stage to pin')

    await page.getByRole('button', { name: /Events/ }).click()
    await waitFor(() => !!document.querySelector('.log__entry .log__type--play'), 'a play entry in the log')
  })
})
