import { describe, it, expect } from 'vite-plus/test'
import { catalogue } from '../../../src/data/catalogue'
import { mountPlayer, waitFor } from '../harness'

function showingIndex(video: HTMLVideoElement): number | null {
  for (let i = 0; i < video.textTracks.length; i++) if (video.textTracks[i].mode === 'showing') return i
  return null
}

describe('captions', () => {
  it('exposes the WebVTT tracks and shows the default one', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.captioned)
    await sink.next('play')
    await waitFor(() => player.captionTracks.length === 2, 'both caption tracks to register')

    expect(player.supportsCaptions).toBe(true)
    expect(player.captionTracks.map((t) => t.label)).toEqual(['English', 'Français'])
    expect(video.textTracks.length).toBe(2)
    // The browser honours `default` on the <track>; the player picks that up via the adapter's
    // `captionschange` a moment later, so both are polled rather than read immediately.
    await waitFor(() => showingIndex(video) === 0, 'the default (English) track to be showing')
    await waitFor(() => player.activeCaptionIndex === 0, 'the player to reflect the default track')
  })

  it('setCaptionTrack switches which track is showing and reports `captionchange`', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.captioned)
    await sink.next('play')
    await waitFor(() => player.captionTracks.length === 2, 'both caption tracks to register')
    await waitFor(() => player.activeCaptionIndex === 0, 'the default track to be active')
    sink.clear()

    player.setCaptionTrack(1)

    const change = await sink.next('captionchange')
    expect(change.captionIndex).toBe(1)
    // The handle applies the native mode change a tick later than it reports it - poll for it.
    await waitFor(() => showingIndex(video) === 1, 'French to become the showing track')
    expect(player.activeCaptionIndex).toBe(1)
    expect(video.textTracks[0].mode).not.toBe('showing')
  })

  it('setCaptionTrack(null) turns captions off', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.captioned)
    await sink.next('play')
    await waitFor(() => player.captionTracks.length === 2, 'both caption tracks to register')
    // Let the default track land (and the player report it) first, or English would switch itself
    // on after we turn everything off - then only look at captionchanges from here on.
    await waitFor(() => player.activeCaptionIndex === 0, 'the default track to be active')
    sink.clear()

    player.setCaptionTrack(null)

    const change = await sink.next('captionchange')
    expect(change.captionIndex).toBeNull()
    await waitFor(() => showingIndex(video) === null, 'all tracks to stop showing')
    expect(player.activeCaptionIndex).toBeNull()
  })

  it('a clip with no tracks reports no caption support', async () => {
    const { player, sink } = await mountPlayer(catalogue.plain)
    await sink.next('play')

    expect(player.captionTracks).toEqual([])
    expect(player.supportsCaptions).toBe(false)
  })
})
