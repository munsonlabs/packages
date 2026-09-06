import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { render } from 'vitest-browser-vue'
// Registers the `ml-controls-*` custom elements (incl. `ml-controls-transcript`), which
// ExposedPlayerPanel creates with plain DOM APIs to stand in for an independent third-party
// script - this import is what the demo's own `main.ts` does at app startup.
import '@munsonlabs/video-player/element'
import ExposedPlayerPanel from '../../src/components/ExposedPlayerPanel.vue'
import { useEventLog } from '../../src/composables/useEventLog'
import { FIXTURE_CUES, FIXTURE_VIDEO, waitFor, waitForLogged, loggedTime } from './helpers'

beforeEach(() => {
  useEventLog().clearLog()
})

describe('ExposedPlayerPanel', () => {
  it('drives a plain Vue VideoPlayer from a genuine third-party web component via exposePlayerOnElement', async () => {
    const screen = await render(ExposedPlayerPanel, { props: { video: FIXTURE_VIDEO, cues: FIXTURE_CUES } })

    const video = screen.container.querySelector<HTMLVideoElement>('#exposed-player video.mlv-video')!
    // Appended imperatively in onMounted - not part of the initial template render.
    expect(screen.container.querySelector('ml-controls-transcript')).not.toBeNull()

    await waitFor(() => video.duration > 0, 'video metadata to load')

    // A click on the independent web component reaches all the way into the Vue player's real
    // <video>, with no Vue-specific wiring on the control side - that's the bridge being proven.
    await screen.getByRole('button', { name: /Cue three/ }).click()

    const seeked = await waitForLogged('seeked')
    expect(loggedTime(seeked)).toBeCloseTo(4, 0)

    await waitForLogged('play')
    expect(video.paused).toBe(false)
  })
})
