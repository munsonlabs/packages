import { describe, it, expect } from 'vite-plus/test'
import { videos, CLIP_DURATION } from '../../fixtures/videos'
import { mountPlayer, waitFor } from './harness'

describe('loop', () => {
  it('toggleLoop reports `loopchange` and flips isLooping', async () => {
    const { player, sink } = await mountPlayer(videos.plain)
    await sink.next('play')
    expect(player.isLooping).toBe(false)

    player.toggleLoop()

    const change = await sink.next('loopchange')
    expect(change.isLooping).toBe(true)
    expect(player.isLooping).toBe(true)
  })

  it('a looping clip wraps to the start at the end instead of emitting `ended`', async () => {
    const { video, player, sink } = await mountPlayer(videos.plain)
    await sink.next('play')
    player.toggleLoop()
    await sink.next('loopchange')

    player.seek(90)
    await sink.next('seeked')
    // Let it run through the end. The loop is implemented in the player (reset + play), so the
    // element must genuinely wrap and a second `play` must be reported.
    await waitFor(() => video.currentTime < CLIP_DURATION * 0.5, 'the playhead to wrap back to the start')

    await sink.next('play', 1)
    expect(video.paused).toBe(false)
    expect(video.ended).toBe(false)
    expect(sink.has('ended')).toBe(false)
    expect(player.hasEnded).toBe(false)
  })

  it('turning loop off again lets the clip end normally', async () => {
    const { player, sink } = await mountPlayer(videos.plain)
    await sink.next('play')
    player.toggleLoop()
    await sink.next('loopchange')
    player.toggleLoop()
    await sink.next('loopchange', 1)
    expect(player.isLooping).toBe(false)

    player.seek(90)
    await sink.next('ended')
    expect(player.hasEnded).toBe(true)
  })
})
