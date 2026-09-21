import { describe, it, expect, vi } from 'vite-plus/test'
import { catalogue, POSTER_URL, CLIP_DURATION } from '@test/browser/catalogue'
import { mountPlayer, mountCard, waitFor } from '@test/browser/harness'

describe('variations', () => {
  it('poster: shown on the element before playback starts', async () => {
    const { video, player } = await mountPlayer(catalogue.poster, { muted: true })

    expect(video.poster).toContain(POSTER_URL)
    expect(video.paused).toBe(true)
    expect(player.isPlaying).toBe(false)
  })

  it('portrait: aspectRatio 9:16 renders the portrait shell', async () => {
    const { screen } = await mountPlayer(catalogue.portrait, { muted: true })

    const shell = screen.container.querySelector<HTMLElement>('.player__shell')!
    expect(shell.classList.contains('player__shell--portrait')).toBe(true)
    expect(shell.style.aspectRatio).toBe('9 / 16')
  })

  it('preload="none": nothing loads until play', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.preloadNone, { muted: true }, { awaitMetadata: false })

    await new Promise((r) => setTimeout(r, 500))
    expect(video.preload).toBe('none')
    expect(video.readyState).toBe(0)
    expect(player.isLoaded).toBe(false)
    expect(sink.has('loaded')).toBe(false)

    await player.play()
    await waitFor(() => player.isLoaded, 'loaded once playing')
    expect(sink.has('loaded')).toBe(true)
  })

  it('loop prop: starts with looping on', async () => {
    const { player } = await mountPlayer(catalogue.loop, { muted: true })
    expect(player.isLooping).toBe(true)
  })

  it('controls=false: no HUD is rendered and the exposed handle still drives playback', async () => {
    const { screen, video, player, sink } = await mountPlayer(catalogue.headless)

    await sink.next('play')
    expect(screen.container.querySelectorAll('.player__shell button')).toHaveLength(0)
    player.togglePlay()
    await sink.next('pause')
    expect(video.paused).toBe(true)
  })

  it('lazy card: placeholder until clicked, then plays', async () => {
    const { video, sink, clickPlaceholder, screen } = await mountCard(catalogue.plain)

    expect(video()).toBeNull()
    expect(screen.container.querySelector('.placeholder')).not.toBeNull()

    await clickPlaceholder()
    await sink.next('play')
    expect(video()?.paused).toBe(false)
  })

  it('playInView: an in-view lazy card starts without a click', async () => {
    const { video, sink } = await mountCard(catalogue.playInView)

    await sink.next('play')
    expect(video()?.paused).toBe(false)
  })

  it('broken source: reports an error, shows Retry, and Retry re-attempts the load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { screen, player, sink } = await mountPlayer(catalogue.broken, { muted: true }, { awaitMetadata: false })

    await sink.next('error')
    expect(player.isError).toBe(true)
    expect(player.isPlaying).toBe(false)
    const retry = screen.getByRole('button', { name: 'Retry' })
    await expect.element(retry).toBeVisible()

    await retry.click()
    await sink.next('error', 1)
    expect(player.isError).toBe(true)
    await expect(player.play()).rejects.toThrow()
  })

  it('HLS: plays the fMP4 playlist (hls.js in Chromium, native in WebKit), seeks and ends', async () => {
    const { video, player, sink } = await mountPlayer(catalogue.hls)
    await sink.next('play')
    expect(player.isLoaded).toBe(true)
    expect(player.duration).toBeCloseTo(CLIP_DURATION, 0)
    expect(player.isLive).toBe(false)

    player.seek(4)
    await sink.next('seeked')
    expect(video.currentTime).toBeGreaterThanOrEqual(3.9)

    await sink.next('ended')
    expect(player.hasEnded).toBe(true)
  })
})
