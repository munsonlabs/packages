import { describe, it, expect, beforeAll } from 'vite-plus/test'
import { bootApp, isPlaying, playButton, waitFor } from './boot'

beforeAll(async () => {
  localStorage.setItem('player:showStage', 'false')
  await bootApp()
})

describe('showcase (stage off)', () => {
  it('an inline `pin` player pins to the corner when scrolled out of view and unpins on return', async () => {
    const panel = [...document.querySelectorAll<HTMLElement>('section.panel')].find((p) => p.textContent?.includes('Pin When Out of View'))!
    panel.scrollIntoView()
    await playButton(panel).click()

    const video = () => panel.querySelector('video.mlv-video')
    await waitFor(() => isPlaying(video()), 'the inline video to start playing')

    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })
    await waitFor(() => !!panel.querySelector('.player--pinned'), 'the player to pin')

    panel.scrollIntoView()
    await waitFor(() => !panel.querySelector('.player--pinned'), 'the player to unpin')
    expect(isPlaying(video())).toBe(true)
  })
})
