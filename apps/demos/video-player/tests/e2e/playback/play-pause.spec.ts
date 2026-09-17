import { describe, it, expect } from 'vite-plus/test'
import { catalogue } from '../../../src/data/catalogue'
import { mountPlayer } from '../harness'

describe('play / pause', () => {
  it('autoplays a muted clip and reports it', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain)

    await sink.next('play')
    expect(video.paused).toBe(false)
    expect(player.isPlaying).toBe(true)
    expect(player.hasEnded).toBe(false)
  })

  it('togglePlay pauses and resumes the real <video>', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.plain)
    await sink.next('play')

    player.togglePlay()
    await sink.next('pause')
    expect(video.paused).toBe(true)
    expect(player.isPlaying).toBe(false)

    player.togglePlay()
    await sink.next('play', 1)
    expect(video.paused).toBe(false)
    expect(player.isPlaying).toBe(true)
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
    const { video, player, sink, activate } = await mountPlayer(catalogue.plain, { muted: false })

    await activate()
    player.togglePlay()

    await sink.next('play')
    expect(video.paused).toBe(false)
    expect(video.muted).toBe(false)
  })
})
