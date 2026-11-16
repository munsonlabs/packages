import { afterEach, describe, it, expect } from 'vite-plus/test'
import { catalogue, CLIP_DURATION } from '@test/browser/catalogue'
import { mountPlayer, waitFor } from '@test/browser/harness'
import type { MountedPlayer } from '@test/browser/harness'

/** Long enough past the viewport observer's 150ms debounce for a play it was going to make to have started. */
const SETTLE_MS = 800

let spacer: HTMLElement | null = null

afterEach(() => {
  spacer?.remove()
  spacer = null
  scrollTo(0, 0)
})

/** A playInView player at the top of a page tall enough to scroll it fully out of view. */
async function mountInView(playInViewRatio?: number): Promise<MountedPlayer> {
  const mounted = await mountPlayer(catalogue.playInView, { muted: true, playInViewRatio })
  await mounted.sink.next('play')
  spacer = document.body.appendChild(document.createElement('div'))
  spacer.style.height = `${innerHeight * 3}px`
  return mounted
}

/** Resolves once the browser has reported the element fully out of view, so the scroll back is a real re-entry. */
function leftView(el: Element): Promise<void> {
  return new Promise((resolve) => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) return
      observer.disconnect()
      resolve()
    })
    observer.observe(el)
  })
}

async function scrollAway({ screen, player, sink }: MountedPlayer): Promise<void> {
  const pauses = sink.of('pause').length
  const shell = screen.container.querySelector('.player__shell')!
  scrollTo(0, document.body.scrollHeight)
  await leftView(shell)
  if (player.isPlaying) await sink.next('pause', pauses)
}

/** Scrolls so that `ratio` of the shell (which sits at the top of the page) is on screen, and waits. */
async function scrollToShowing({ screen }: MountedPlayer, ratio: number): Promise<void> {
  const shell = screen.container.querySelector('.player__shell')!
  const { top, height } = shell.getBoundingClientRect()
  scrollTo(0, scrollY + top + height * (1 - ratio))
  await new Promise((r) => setTimeout(r, SETTLE_MS))
}

async function scrollAwayAndBack(mounted: MountedPlayer): Promise<void> {
  await scrollAway(mounted)
  await scrollToShowing(mounted, 1)
}

describe('playInView', () => {
  it('plays again when scrolled back into view after pausing offscreen', async () => {
    const mounted = await mountInView()

    await scrollAwayAndBack(mounted)

    await waitFor(() => mounted.player.isPlaying, 'playback to resume in view')
    expect(mounted.sink.of('play').length).toBeGreaterThan(1)
  })

  it('stays paused when scrolled back into view after the viewer paused it', async () => {
    const mounted = await mountInView()
    mounted.player.togglePlay()
    await mounted.sink.next('pause')

    await scrollAwayAndBack(mounted)

    expect(mounted.player.isPlaying).toBe(false)
    expect(mounted.sink.of('play')).toHaveLength(1)
  })

  it('stays on its end when scrolled back into view after it ended', async () => {
    const mounted = await mountInView()
    mounted.player.seek(CLIP_DURATION - 0.5)
    await mounted.sink.next('ended')

    await scrollAwayAndBack(mounted)

    expect(mounted.player.hasEnded).toBe(true)
    expect(mounted.player.isPlaying).toBe(false)
    expect(mounted.sink.of('play')).toHaveLength(1)
  })

  it('waits for more of the player when given a higher playInViewRatio', async () => {
    const mounted = await mountInView(1)
    await scrollAway(mounted)

    await scrollToShowing(mounted, 0.7)
    expect(mounted.player.isPlaying).toBe(false)

    await scrollToShowing(mounted, 1)
    await waitFor(() => mounted.player.isPlaying, 'playback to resume once all of it is in view')
  })
})
