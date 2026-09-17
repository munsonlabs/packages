import { describe, it, expect } from 'vite-plus/test'
import { catalogue, CLIP_DURATION } from '@test/browser/catalogue'
import { mountPlayer } from '@test/browser/harness'

describe('ended', () => {
  it('reaching the end emits `ended` once, at the full duration, and leaves the player stopped', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain)
    await sink.next('play')
    player.seek(90)
    await sink.next('seeked')

    const ended = await sink.next('ended')

    expect(ended.currentTime).toBeCloseTo(CLIP_DURATION, 0)
    expect(video.ended).toBe(true)
    expect(player.hasEnded).toBe(true)
    expect(player.isPlaying).toBe(false)
    expect(sink.of('ended')).toHaveLength(1)
  })

  it('togglePlay after `ended` replays from the start', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain)
    await sink.next('play')
    player.seek(90)
    await sink.next('ended')

    player.togglePlay()

    await sink.next('play', 1)
    expect(video.currentTime).toBeLessThan(1)
    expect(player.hasEnded).toBe(false)
    expect(video.paused).toBe(false)
  })

  it('replay() restarts from the beginning', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain)
    await sink.next('play')
    player.seek(90)
    await sink.next('ended')

    await player.replay()

    expect(video.currentTime).toBeLessThan(1)
    expect(video.paused).toBe(false)
    expect(player.hasEnded).toBe(false)
  })
})
