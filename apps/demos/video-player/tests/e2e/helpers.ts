import type { VideoEntry } from '@munsonlabs/video-player'
import { useEventLog } from '../../src/composables/useEventLog'
import fixtureUrl from '../fixtures/flower.mp4?url'

/** Served by Vite from the repo, so no test depends on a third-party CDN. ~5s long (MDN's CC0 sample). */
export const FIXTURE_DURATION = 5.055

export const FIXTURE_VIDEO: VideoEntry = { title: 'Fixture clip', src: fixtureUrl }

/** Cue times chosen to sit well inside the 5s fixture. */
export const FIXTURE_CUES = [
  { time: 0, text: 'Cue one - opening frame.' },
  { time: 2, text: 'Cue two - two seconds in.' },
  { time: 4, text: 'Cue three - four seconds in.' },
]

/**
 * Polls a predicate until it's truthy. Playback state (metadata load, seeking, play starting)
 * lands asynchronously against a real `<video>` element, not on a fake timer.
 */
export async function waitFor(predicate: () => boolean, message: string, timeout = 10_000): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error(`Timed out waiting for: ${message}`)
    await new Promise((r) => setTimeout(r, 50))
  }
}

/**
 * Waits for a `state-change` of the given type to reach the demo's shared event log and returns
 * it - the same event consumers of the package see, so it proves the behaviour, not just the DOM.
 */
export async function waitForLogged(type: string, message = `a '${type}' state-change to be logged`) {
  const { log } = useEventLog()
  await waitFor(() => log.value.some((e) => e.type === type), message)
  return log.value.find((e) => e.type === type)!
}

/** The log stores `currentTime` pre-formatted (e.g. "2.0s"); this reads it back as a number. */
export function loggedTime(entry: { ct: string }): number {
  return parseFloat(entry.ct)
}
