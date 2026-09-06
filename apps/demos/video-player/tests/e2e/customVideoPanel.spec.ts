import { describe, it, expect, beforeEach, afterEach } from 'vite-plus/test'
import { render } from 'vitest-browser-vue'
import CustomVideoPanel from '../../src/components/CustomVideoPanel.vue'
import { useCustomVideos } from '../../src/composables/useCustomVideos'
import { useEventLog } from '../../src/composables/useEventLog'
import { videos } from '../../src/data/demoVideos'
import { FIXTURE_VIDEO, waitFor, waitForLogged } from './helpers'

beforeEach(() => {
  useCustomVideos().clearCustomVideos()
  useEventLog().clearLog()
})

afterEach(() => {
  useCustomVideos().clearCustomVideos()
})

describe('CustomVideoPanel', () => {
  it('adds a user-submitted video, plays it to the end, then removes it', async () => {
    const screen = await render(CustomVideoPanel)

    await screen.getByPlaceholder('https://...').fill(FIXTURE_VIDEO.src)
    await screen.getByRole('button', { name: 'Preview' }).click()

    expect(useCustomVideos().customVideos.value).toHaveLength(1)
    expect(useCustomVideos().customVideos.value[0].src).toBe(FIXTURE_VIDEO.src)

    // Persisted to localStorage so it survives a reload (the watcher flushes asynchronously).
    await waitFor(() => JSON.parse(localStorage.getItem('player:customVideos') ?? '[]').length === 1, 'the new video to persist')

    // Lazy-loaded by default - clicking the placeholder both activates and autoplays it.
    await screen.getByRole('button', { name: 'Play' }).click()
    await waitForLogged('play')

    // Short fixture, so the full lifecycle is reachable - something the CDN-hosted clips never were.
    await waitForLogged('ended')

    await screen.getByRole('button', { name: 'Remove video' }).click()
    expect(useCustomVideos().customVideos.value).toHaveLength(0)
    expect(screen.container.querySelector('.custom-video-card')).toBeNull()
  })

  it('rejects submission with no video URL', async () => {
    const screen = await render(CustomVideoPanel)

    await screen.getByRole('button', { name: 'Preview' }).click()

    // The input's own `required` attribute blocks the browser's native form submission before
    // Vue's `onSubmit` ever runs - so nothing is added, and the field reports itself invalid.
    expect(useCustomVideos().customVideos.value).toHaveLength(0)
    const urlInput = screen.getByPlaceholder('https://...').element() as HTMLInputElement
    expect(urlInput.validity.valid).toBe(false)
  })

  it('fills the form from the "pick an example" preset dropdown', async () => {
    const screen = await render(CustomVideoPanel)

    // Not gesture-sensitive (just populates form fields, no playback involved) - a plain DOM
    // dispatch is fine here.
    const presetSelect = screen.container.querySelector<HTMLSelectElement>('select.field__preset')!
    presetSelect.value = '0'
    presetSelect.dispatchEvent(new Event('change', { bubbles: true }))

    await expect.element(screen.getByPlaceholder('https://...')).toHaveValue(videos[0].src)
  })
})
