import { describe, it, expect } from 'vite-plus/test'
import { catalogue } from '@test/browser/catalogue'
import { mountPlayer } from '@test/browser/harness'

describe('play / pause', () => {
  it('autoplays a muted clip and reports it', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain)

    await sink.next('play')
    expect(video.paused).toBe(false)
    expect(player.isPlaying).toBe(true)
    expect(player.hasEnded).toBe(false)
  })

  it('pause() and play() drive the real <video>, and play() resolves once playing', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain)
    await sink.next('play')

    player.pause()
    await sink.next('pause')
    expect(video.paused).toBe(true)
    expect(player.isPlaying).toBe(false)

    await player.play()
    expect(video.paused).toBe(false)
    expect(player.isPlaying).toBe(true)
    expect(sink.of('play')).toHaveLength(2)
  })

  it('togglePlay flips between the two', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain)
    await sink.next('play')

    player.togglePlay()
    await sink.next('pause')
    expect(video.paused).toBe(true)

    player.togglePlay()
    await sink.next('play', 1)
    expect(video.paused).toBe(false)
  })

  it('does not start on its own without autoplay', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain, { muted: true })

    await new Promise((r) => setTimeout(r, 500))
    expect(video.paused).toBe(true)
    expect(player.isPlaying).toBe(false)
    expect(video.currentTime).toBe(0)
    expect(sink.has('play')).toBe(false)
  })

  it('an unmuted clip plays after a user gesture', async () => {
    const { video, activate, player } = await mountPlayer(catalogue.plain, { muted: false })

    await activate()
    await player.play()

    expect(video.paused).toBe(false)
    expect(video.muted).toBe(false)
  })
})
