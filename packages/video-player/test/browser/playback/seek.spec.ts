import { describe, it, expect } from 'vite-plus/test'
import { catalogue, CLIP_DURATION } from '@test/browser/catalogue'
import { mountPlayer, waitFor } from '@test/browser/harness'

const HALFWAY = CLIP_DURATION / 2

describe('seek', () => {
  it('moves the playhead and emits `seeked` at the new time', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain)
    await sink.next('play')

    player.seek(HALFWAY)

    const seeked = await sink.next('seeked')
    expect(seeked.currentTime).toBeCloseTo(HALFWAY, 0)
    expect(video.currentTime).toBeGreaterThanOrEqual(HALFWAY - 0.1)
    expect(player.currentTime).toBeGreaterThanOrEqual(HALFWAY - 0.1)
  })

  it('seeking backwards works while playing, and playback continues', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain)
    await sink.next('play')
    player.seek(CLIP_DURATION * 0.8)
    await sink.next('seeked')

    player.seek(CLIP_DURATION * 0.1)
    const back = await sink.next('seeked', 1)

    expect(back.currentTime).toBeCloseTo(CLIP_DURATION * 0.1, 0)
    expect(video.paused).toBe(false)
    await waitFor(() => video.currentTime > CLIP_DURATION * 0.1 + 0.2, 'playback to keep advancing after the seek')
  })

  it('clamps a seek past the end to the duration', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain)
    await sink.next('play')

    player.seek(2)
    const seeked = await sink.next('seeked')
    expect(seeked.currentTime).toBeCloseTo(2, 0)

    player.seek(999)
    await sink.next('seeked', 1)
    expect(video.currentTime).toBeCloseTo(CLIP_DURATION, 0)
  })

  it('clamps a negative seek to the start', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain)
    await sink.next('play')
    player.seek(HALFWAY)
    await sink.next('seeked')

    player.seek(-10)
    await sink.next('seeked', 1)

    expect(video.currentTime).toBeCloseTo(0, 0)
  })

  it('seeking while paused stays paused', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain)
    await sink.next('play')
    player.togglePlay()
    await sink.next('pause')

    player.seek(CLIP_DURATION * 0.6)
    await sink.next('seeked')

    expect(video.paused).toBe(true)
    expect(video.currentTime).toBeCloseTo(CLIP_DURATION * 0.6, 0)
  })
})
