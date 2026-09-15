import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { render } from 'vitest-browser-vue'
import TranscriptPanel from '../../src/components/TranscriptPanel.vue'
import { useEventLog } from '../../src/composables/useEventLog'
import { FIXTURE_CUES, FIXTURE_VIDEO, waitFor, waitForLogged, loggedTime } from './helpers'

beforeEach(() => {
  useEventLog().clearLog()
})

describe('TranscriptPanel', () => {
  it('clicking a cue seeks to its timestamp and starts playback', async () => {
    const screen = await render(TranscriptPanel, { props: { video: FIXTURE_VIDEO, cues: FIXTURE_CUES } })

    const video = screen.container.querySelector<HTMLVideoElement>('video.mlv-video')!
    // Transcript's onCueClick only seeks once `player.total > 0`.
    await waitFor(() => video.duration > 0, 'video metadata to load')

    // A locator-driven click carries a genuine user gesture; a raw DOM `element.click()` does
    // not, and browsers refuse unmuted `play()` without one.
    await screen.getByRole('button', { name: /Cue two/ }).click()

    const seeked = await waitForLogged('seeked')
    expect(loggedTime(seeked)).toBeCloseTo(2, 0)

    await waitForLogged('play')
    expect(video.paused).toBe(false)
  })

  it('highlights the cue under the playhead and clears it in an `end` gap', async () => {
    const cues = [
      { time: 0, text: 'Cue one - opening frame.' },
      { time: 1, end: 2, text: 'Cue two - ends at two.' },
    ]
    const screen = await render(TranscriptPanel, { props: { video: FIXTURE_VIDEO, cues } })

    const video = screen.container.querySelector<HTMLVideoElement>('video.mlv-video')!
    await waitFor(() => video.duration > 0, 'video metadata to load')

    const cueTwo = screen.getByRole('button', { name: /Cue two/ })
    await cueTwo.click()
    await waitForLogged('play')

    await waitFor(() => cueTwo.element().getAttribute('aria-current') === 'true', 'cue two to become active')

    // Past cue two's `end`, nothing should be highlighted - the gap is deliberate. Polled, since
    // the player's `current` trails the raw <video> clock by up to one `timeupdate` tick.
    await waitFor(() => video.currentTime >= 2.2, 'playhead to pass the cue gap')
    await waitFor(() => screen.container.querySelector('[aria-current="true"]') === null, 'the highlight to clear in the gap')
  })
})
