import { describe, it, expect } from 'vite-plus/test'
import { catalogue } from '../../../src/data/catalogue'
import { mountPlayer, waitFor } from '../harness'

describe('playback rate', () => {
  it('setPlaybackRate changes the element rate and reports `ratechange`', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain)
    await sink.next('play')
    expect(player.supportsPlaybackRate).toBe(true)
    expect(player.currentPlaybackRate).toBe(1)

    player.setPlaybackRate(2)

    const change = await sink.next('ratechange')
    expect(change.playbackRate).toBe(2)
    expect(video.playbackRate).toBe(2)
    expect(player.currentPlaybackRate).toBe(2)
  })

  it('a faster rate actually advances the playhead faster', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain)
    await sink.next('play')
    player.setPlaybackRate(2)
    await sink.next('ratechange')

    const start = video.currentTime
    const wall = performance.now()
    await waitFor(() => video.currentTime - start >= 1, 'one second of media to elapse')
    const elapsedMs = performance.now() - wall

    // 1s of media at 2x should take ~500ms of wall clock; a wide band, since headless timing is coarse.
    expect(elapsedMs).toBeLessThan(900)
  })

  it('restoring 1x reports it', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain)
    await sink.next('play')
    player.setPlaybackRate(0.5)
    await sink.next('ratechange')

    player.setPlaybackRate(1)
    const back = await sink.next('ratechange', 1)

    expect(back.playbackRate).toBe(1)
    expect(video.playbackRate).toBe(1)
  })
})
