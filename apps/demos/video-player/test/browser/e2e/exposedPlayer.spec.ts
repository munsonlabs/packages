import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { render } from 'vitest-browser-vue'
import '@munsonlabs/video-player/element'
import ExposedPlayerPanel from '../../../src/components/ExposedPlayerPanel.vue'
import { useEventLog } from '../../../src/composables/useEventLog'
import { catalogue } from '../../../src/data/catalogue'
import { CUES, waitFor, waitForLogged, loggedTime } from './harness'

beforeEach(() => {
  useEventLog().clearLog()
})

describe('ExposedPlayerPanel', () => {
  it('drives a plain Vue VideoPlayer from a genuine third-party web component via exposePlayerOnElement', async () => {
    const screen = await render(ExposedPlayerPanel, { props: { video: catalogue.plain, cues: CUES } })

    const video = screen.container.querySelector<HTMLVideoElement>('#exposed-player video.mlv-video')!
    expect(screen.container.querySelector('ml-controls-transcript')).not.toBeNull()

    await waitFor(() => video.duration > 0, 'video metadata to load')

    await screen.getByRole('button', { name: /Cue three/ }).click()

    const seeked = await waitForLogged('seeked')
    expect(loggedTime(seeked)).toBeCloseTo(4, 0)

    await waitForLogged('play')
    expect(video.paused).toBe(false)
  })
})
