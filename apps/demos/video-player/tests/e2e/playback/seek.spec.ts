import { describe, it, expect } from 'vite-plus/test'
import { videos, CLIP_DURATION } from '../../fixtures/videos'
import { mountPlayer, waitFor } from './harness'

describe('seek', () => {
  it('seek(percent) moves the playhead and emits `seeked` at the new time', async () => {
    const { video, player, sink } = await mountPlayer(videos.plain)
    await sink.next('play')

    player.seek(50)

    const seeked = await sink.next('seeked')
    expect(seeked.currentTime).toBeCloseTo(CLIP_DURATION / 2, 0)
    expect(video.currentTime).toBeGreaterThanOrEqual(CLIP_DURATION / 2 - 0.1)
    expect(player.current).toBeGreaterThanOrEqual(CLIP_DURATION / 2 - 0.1)
  })

  it('seeking backwards works while playing, and playback continues', async () => {
    const { video, player, sink } = await mountPlayer(videos.plain)
    await sink.next('play')
    player.seek(80)
    await sink.next('seeked')

    player.seek(10)
    const back = await sink.next('seeked', 1)

    expect(back.currentTime).toBeCloseTo(CLIP_DURATION * 0.1, 0)
    expect(video.paused).toBe(false)
    await waitFor(() => video.currentTime > CLIP_DURATION * 0.1 + 0.2, 'playback to keep advancing after the seek')
  })

  it('seeking while paused stays paused', async () => {
    const { video, player, sink } = await mountPlayer(videos.plain)
    await sink.next('play')
    player.togglePlay()
    await sink.next('pause')

    player.seek(60)
    await sink.next('seeked')

    expect(video.paused).toBe(true)
    expect(video.currentTime).toBeCloseTo(CLIP_DURATION * 0.6, 0)
  })
})
