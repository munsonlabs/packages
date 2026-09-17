import { describe, it, expect } from 'vite-plus/test'
import { catalogue } from '../../../src/data/catalogue'
import { mountPlayer } from '../harness'

describe('mute / volume', () => {
  it('starts muted when asked to, and toggleMute unmutes the real <video>', async () => {
    const { video, player, sink, activate } = await mountPlayer(catalogue.plain)
    await sink.next('play')
    expect(video.muted).toBe(true)
    expect(player.isMuted).toBe(true)
    expect(player.isAudible).toBe(false)

    await activate()
    player.toggleMute()

    const change = await sink.next('volumechange')
    expect(change.isMuted).toBe(false)
    expect(video.muted).toBe(false)
    expect(player.isMuted).toBe(false)
    expect(player.isAudible).toBe(true)
    expect(video.paused).toBe(false)
  })

  it('toggleMute re-mutes and reports it', async () => {
    const { video, player, sink, activate } = await mountPlayer(catalogue.plain)
    await sink.next('play')
    await activate()

    player.toggleMute()
    await sink.next('volumechange')
    player.toggleMute()
    const reMuted = await sink.next('volumechange', 1)

    expect(reMuted.isMuted).toBe(true)
    expect(video.muted).toBe(true)
  })

  it('setVolume drives the element volume, and dragging to 0 mutes', async () => {
    const { video, player, sink, activate } = await mountPlayer(catalogue.plain)
    await sink.next('play')
    await activate()
    player.toggleMute()
    await sink.next('volumechange')

    player.setVolume(0.4)
    await sink.next('volumechange', 1)
    expect(video.volume).toBeCloseTo(0.4, 5)
    expect(player.vol).toBeCloseTo(0.4, 5)
    expect(player.isAudible).toBe(true)

    player.setVolume(0)
    await sink.next('volumechange', 2)
    expect(video.volume).toBe(0)
    expect(video.muted).toBe(true)
    expect(player.isMuted).toBe(true)
    expect(player.isAudible).toBe(false)
  })
})
