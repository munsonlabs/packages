import { afterEach, describe, it, expect } from 'vite-plus/test'
import { defineComponent, h, onMounted, ref } from 'vue'
import { render } from 'vitest-browser-vue'
import { VideoPlayer, Scrubber } from '@/index'
import type { PlayerHandle, VideoEntry } from '@/index'
import { catalogue } from '@test/browser/catalogue'
import { EventSink, mountPlayer, waitFor } from '@test/browser/harness'

const original = `${location.pathname}${location.search}${location.hash}`

function goTo(url: string): void {
  history.replaceState(null, '', url)
}

afterEach(() => goTo(original))

/** Several players in one page, optionally below a spacer so scrolling can be observed. */
async function mountMany(entries: Array<Partial<VideoEntry>>, { spacer = 0 } = {}) {
  const handles: Array<PlayerHandle | null> = entries.map(() => null)
  const sinks = entries.map(() => new EventSink())
  const Host = defineComponent({
    setup() {
      const refs = entries.map(() => ref<PlayerHandle | null>(null))
      onMounted(() => refs.forEach((r, i) => (handles[i] = r.value)))
      return () =>
        h('div', [
          spacer ? h('div', { style: { height: `${spacer}px` } }) : null,
          ...entries.map((entry, i) =>
            h(VideoPlayer, { ...catalogue.plain, muted: true, ...entry, ref: refs[i], onStateChange: sinks[i].push }, () =>
              entry.controls === false ? [h(Scrubber)] : [],
            ),
          ),
        ])
    },
  })
  const screen = await render(Host)
  await waitFor(() => handles.every((p) => p?.isLoaded), 'every player to load')
  return { screen, players: handles as PlayerHandle[], sinks }
}

describe('deep links', () => {
  it('seeks to the start of #ml-t=start,end and publishes the range', async () => {
    goTo('#ml-t=1,2')
    const { player } = await mountPlayer(catalogue.plain, { muted: true, deepLink: true })
    await waitFor(() => Math.abs(player.currentTime - 1) < 0.2, 'the playhead to reach 1s')
    expect(player.clipRange).toEqual({ start: 1, end: 2 })
    expect(player.isPlaying).toBe(false)
  })

  it('pauses once at the end of the range', async () => {
    goTo('#ml-t=1,1.8')
    const { player, video, sink } = await mountPlayer(catalogue.plain, { muted: true, deepLink: true })
    await waitFor(() => Math.abs(player.currentTime - 1) < 0.2, 'the seek to the start')
    await player.play()
    await sink.next('pause')
    expect(video.currentTime).toBeGreaterThanOrEqual(1.8)
    expect(video.currentTime).toBeLessThan(2.4)
    // Once: playing again carries on past the end.
    await player.play()
    await waitFor(() => video.currentTime > 2.6, 'playback to continue past the range')
  })

  it('loops the range with deepLinkEnd loop until the viewer seeks away', async () => {
    goTo('#ml-t=1,1.6')
    const { player, video } = await mountPlayer(catalogue.plain, { muted: true, deepLink: true, deepLinkEnd: 'loop' })
    await waitFor(() => Math.abs(player.currentTime - 1) < 0.2, 'the seek to the start')
    await player.play()
    await waitFor(() => video.currentTime > 1.5, 'playback to reach the end of the range')
    await waitFor(() => video.currentTime < 1.3, 'the loop back to the start')
    expect(player.isPlaying).toBe(true)
    player.seek(4)
    await waitFor(() => player.clipRange === null, 'the range to let go after seeking away')
    await waitFor(() => video.currentTime > 4.2, 'playback to stay where the viewer went')
  })

  it('ignores the hash without the deepLink prop', async () => {
    goTo('#ml-t=3,4')
    const { player } = await mountPlayer(catalogue.plain, { muted: true })
    await new Promise((r) => setTimeout(r, 300))
    expect(player.currentTime).toBe(0)
    expect(player.clipRange).toBeNull()
  })

  it('answers only the player an ml-player id names', async () => {
    goTo('#ml-t=2,3&ml-player=second')
    const { players } = await mountMany([{ deepLink: 'first' }, { deepLink: 'second' }])
    await waitFor(() => Math.abs(players[1].currentTime - 2) < 0.2, 'the named player to seek')
    expect(players[0].currentTime).toBe(0)
    expect(players[0].clipRange).toBeNull()
  })

  it('gives a link without an id to the first deep-link player only', async () => {
    goTo('#ml-t=2,3')
    const { players } = await mountMany([{}, { deepLink: true }, { deepLink: true }])
    await waitFor(() => Math.abs(players[1].currentTime - 2) < 0.2, 'the first deep-link player to seek')
    expect(players[0].clipRange).toBeNull()
    expect(players[2].clipRange).toBeNull()
    expect(players[2].currentTime).toBe(0)
  })

  it('scrolls the player into view and follows a later hashchange', async () => {
    goTo('#ml-t=1,2')
    const { players, screen } = await mountMany([{ deepLink: true }], { spacer: 3000 })
    const shell = screen.container.querySelector('.player__shell')!
    await waitFor(() => {
      const box = shell.getBoundingClientRect()
      return box.top >= 0 && box.bottom <= innerHeight
    }, 'the player to scroll into view')

    location.hash = 'ml-t=4,4.5'
    await waitFor(() => Math.abs(players[0].currentTime - 4) < 0.2, 'the seek to the new link')
    expect(players[0].clipRange).toEqual({ start: 4, end: 4.5 })
  })

  it('highlights the range on the scrubber', async () => {
    goTo('#ml-t=1,2')
    const { screen, players } = await mountMany([{ deepLink: true, controls: false }])
    await waitFor(() => players[0].clipRange !== null, 'the range')
    const range = screen.container.querySelector<HTMLElement>('[data-testid="clip-range"]')!
    const duration = players[0].duration
    expect(parseFloat(range.style.left)).toBeCloseTo((1 / duration) * 100, 1)
    expect(parseFloat(range.style.width)).toBeCloseTo((1 / duration) * 100, 1)
    const slider = screen.container.querySelector('input[type="range"]')!
    expect(slider.getAttribute('aria-valuetext')).toContain('linked moment from 0:01 to 0:02')
  })
})
