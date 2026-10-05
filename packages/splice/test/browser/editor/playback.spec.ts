import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import { engine } from '@test/browser/helpers'
import { EditorHarness, sampleTimes, sleep, waitFor } from '@test/browser/editor-harness'

vi.mock('@/editor/labels', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/editor/labels')>()),
  CLIP_LENGTH: 2,
  LONGEST_CLIP: 3,
}))

const harness = new EditorHarness()
const part = <T extends Element = HTMLElement>(selector: string) => harness.part<T>(selector)
const video = () => harness.video()
const openEditing = (props: Record<string, unknown> = {}) => harness.open({ endCard: false, ...props })
const percent = (value: string) => Number.parseFloat(value)

afterEach(() => {
  harness.cleanup()
  vi.restoreAllMocks()
})

/** Where the playhead is, as a time, read back from its position on the filmstrip. */
function readPlayheadTime(): number {
  const max = Number(part('.splice-handle[data-handle="end"]').getAttribute('aria-valuemax'))
  return (percent(part('.splice-playhead').style.left) / 100) * max
}

/** Clicks the selection at `time` and waits for the preview's seek to land there. */
async function seekAndSettle(time: number): Promise<void> {
  const box = part('.splice-timeline').getBoundingClientRect()
  const max = Number(part('.splice-handle[data-handle="end"]').getAttribute('aria-valuemax'))
  const init = { bubbles: true, composed: true, clientX: box.left + (time / max) * box.width, clientY: box.top + 10, pointerId: 9 }
  part('.splice-selection').dispatchEvent(new PointerEvent('pointerdown', init))
  part('.splice-selection').dispatchEvent(new PointerEvent('pointerup', init))
  await waitFor(() => !video().seeking && Math.abs(video().currentTime - time) < 0.15, `the seek to ${time}`)
}

describe('<SpliceEditor> playback through the page’s player', () => {
  it('loops the range on the player, with the playhead moving inside the selection', async () => {
    await openEditing()
    await harness.waitForPlaying()
    const selection = part('.splice-selection')
    const low = percent(selection.style.left)
    const high = low + percent(selection.style.width)
    const seen = new Set<string>()
    const outside: string[] = []
    const hasLooped = (times: number[]) => times.some((time, i) => i > 0 && time < times[i - 1] - 1)

    // Every presented frame, for at least 3s and until it has looped once through the 2s selection.
    const times = await sampleTimes(video(), hasLooped, 'the preview to loop the range', {
      atLeast: 3000,
      onSample: () => {
        const playhead = part('.splice-playhead')
        if (playhead.hidden) return
        seen.add(playhead.style.left)
        const at = percent(playhead.style.left)
        if (at < low - 0.01 || at > high + 0.01) outside.push(playhead.style.left)
      },
    })
    expect(outside, 'playhead positions outside the selection').toEqual([])
    expect(Math.min(...times)).toBeGreaterThanOrEqual(harness.range.start - 0.3)
    expect(Math.max(...times)).toBeLessThanOrEqual(harness.range.end + 0.1)
    expect(hasLooped(times)).toBe(true)
    expect(seen.size).toBeGreaterThan(1)

    await harness.pause()
    await seekAndSettle(2.6)
    await waitFor(() => Math.abs(readPlayheadTime() - video().currentTime) < 0.1, 'the playhead to follow the seek')
  })

  it('moves the playhead on every frame, far more often than timeupdate', async () => {
    await openEditing()
    await harness.waitForPlaying()
    let moves = 0
    const observer = new MutationObserver(() => moves++)
    observer.observe(part('.splice-playhead'), { attributes: true, attributeFilter: ['style'] })
    let timeupdates = 0
    const onTimeupdate = () => timeupdates++
    video().addEventListener('timeupdate', onTimeupdate)

    await sampleTimes(video(), () => true, 'a while of playback', { atLeast: 2500 })
    observer.disconnect()
    video().removeEventListener('timeupdate', onTimeupdate)
    console.log(`SPLICE_PLAYHEAD ${engine()} playhead moves=${moves} timeupdates=${timeupdates} in 2.5s`)
    expect(moves).toBeGreaterThan(timeupdates * 2)
    expect(moves).toBeGreaterThan(25)
  })

  it('holds position when paused, while the handles and the crop keep their arrow keys', async () => {
    await openEditing()
    await harness.waitForPlaying()
    // The player's HUD is hidden while the editor is open; its play button is the panel's.
    const play = part<HTMLButtonElement>('.splice-transport .ml-video-play-button')
    play.click()
    await waitFor(() => video().paused && !harness.player.isPlaying, 'the pause')
    await waitFor(() => !video().seeking, 'any seek to settle')
    const held = video().currentTime
    await sleep(400)
    expect(video().currentTime).toBeCloseTo(held, 3)

    part('.splice-handle[data-handle="start"]').focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(harness.range.start).toBe(1.8)
    part('.splice-crop').focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(harness.cropFocus).toBeCloseTo(0.45, 5)
    expect(harness.player.clipRange).toEqual(harness.range)

    play.click()
    await waitFor(() => !video().paused, 'playing again')
  })

  it('seeks on a click inside the selection without moving the handles; a drag still moves the range', async () => {
    await openEditing()
    await harness.waitForPlaying()
    await harness.pause()
    const before = harness.range
    await seekAndSettle(2.8)
    expect(harness.range).toEqual(before)
    await waitFor(() => Math.abs(readPlayheadTime() - 2.8) < 0.1, 'the playhead at the click')

    // Under the drag threshold is still a click.
    const box = part('.splice-timeline').getBoundingClientRect()
    const selection = part('.splice-selection')
    const at = (clientX: number) => ({ bubbles: true, composed: true, clientX, clientY: box.top + 10, pointerId: 11 })
    const x = box.left + (2 / 5.055) * box.width
    selection.dispatchEvent(new PointerEvent('pointerdown', at(x)))
    selection.dispatchEvent(new PointerEvent('pointermove', at(x + 2)))
    selection.dispatchEvent(new PointerEvent('pointerup', at(x + 2)))
    expect(harness.range).toEqual(before)
    await waitFor(() => !video().seeking && Math.abs(video().currentTime - 2) < 0.1, 'the seek to 2s')

    // Past it, the range moves, and the playhead hides while it does.
    await waitFor(() => !part('.splice-playhead').hidden, 'the playhead')
    selection.dispatchEvent(new PointerEvent('pointerdown', at(x)))
    selection.dispatchEvent(new PointerEvent('pointermove', at(x - box.width * 0.1)))
    await waitFor(() => part('.splice-playhead').hidden === true, 'the playhead to hide')
    selection.dispatchEvent(new PointerEvent('pointerup', at(x - box.width * 0.1)))
    await sleep(0)
    expect(harness.range.start).toBeLessThan(before.start)
    expect(harness.range.end - harness.range.start).toBeCloseTo(before.end - before.start, 5)

    // A press outside the selection does nothing.
    await waitFor(() => !video().seeking, 'the seek to settle')
    const range = harness.range
    const held = video().currentTime
    const canvas = part('.splice-timeline canvas')
    canvas.dispatchEvent(new PointerEvent('pointerdown', at(box.right - 2)))
    canvas.dispatchEvent(new PointerEvent('pointerup', at(box.right - 2)))
    await sleep(200)
    expect(video().currentTime).toBe(held)
    expect(harness.range).toEqual(range)
  })

  it('hides the playhead while a handle is dragged, and loops the new range', async () => {
    await openEditing()
    await harness.waitForPlaying()
    await waitFor(() => !part('.splice-playhead').hidden, 'the playhead')
    const box = part('.splice-timeline').getBoundingClientRect()
    const end = part('.splice-handle[data-handle="end"]')
    const at = (time: number) => ({
      bubbles: true,
      composed: true,
      clientX: box.left + (time / 5.055) * box.width,
      clientY: box.top + 10,
      pointerId: 12,
    })

    end.dispatchEvent(new PointerEvent('pointerdown', at(3.3)))
    end.dispatchEvent(new PointerEvent('pointermove', at(4)))
    await waitFor(() => part('.splice-playhead').hidden === true, 'the playhead to hide')
    end.dispatchEvent(new PointerEvent('pointerup', at(4)))
    await waitFor(() => !part('.splice-playhead').hidden, 'the playhead back')
    // The preview shows the second before the new end, then loops back to the start.
    expect(harness.range.end).toBeCloseTo(4, 1)
    await waitFor(() => video().currentTime > 3.6, 'playback near the new end')
    await waitFor(() => video().currentTime < harness.range.start + 0.5, 'the loop back to the start')
  })

  it('pauses the player while exporting and resumes it after a cancel', async () => {
    await openEditing()
    await harness.waitForPlaying()
    part<HTMLButtonElement>('.splice-export-button').click()
    await waitFor(() => video().paused, 'the player to rest')
    await waitFor(() => part('.splice-cancel') !== null, 'the cancel button')
    part<HTMLButtonElement>('.splice-cancel').click()
    await waitFor(() => harness.state === 'editing' && !video().paused, 'the player to play again')
  })
})

describe('<SpliceEditor> transport', () => {
  const button = (name: string) => part<HTMLButtonElement>(`.splice-transport .ml-video-${name}-button`)
  const transportButtons = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.splice-transport button'))

  it('plays and pauses the page’s player, the label following', async () => {
    await openEditing()
    await harness.waitForPlaying()
    await waitFor(() => button('play').getAttribute('aria-label') === 'Pause', 'the Pause label')
    button('play').click()
    await waitFor(() => video().paused && !harness.player.isPlaying, 'the player to pause')
    await waitFor(() => button('play').getAttribute('aria-label') === 'Play', 'the Play label')
    button('play').click()
    await waitFor(() => !video().paused && harness.player.isPlaying, 'the player to play again')
  })

  it('reads the time from the start of the clip', async () => {
    await openEditing()
    await harness.pause()
    await harness.seekTo(2.3)
    const clock = () => part('.splice-clock').textContent!.replace(/\s+/g, ' ').trim()
    await waitFor(() => /^0:0[0-2] \/ 0:02$/.test(clock()), 'a clip-relative time', 20_000, clock)
  })

  it('mutes and unmutes the player', async () => {
    await openEditing()
    const was = harness.player.isMuted
    await waitFor(() => button('mute').getAttribute('aria-label') === (was ? 'Unmute' : 'Mute'), 'the mute label')
    button('mute').click()
    await waitFor(() => harness.player.isMuted === !was, 'the toggled mute')
    await waitFor(() => button('mute').getAttribute('aria-label') === (was ? 'Mute' : 'Unmute'), 'the flipped label')
    button('mute').click()
    await waitFor(() => harness.player.isMuted === was, 'the mute restored')
  })

  it('takes its labels from the labels prop', async () => {
    await openEditing({ labels: { play: 'Spela', pause: 'Paus' } })
    await harness.waitForPlaying()
    await waitFor(() => button('play').getAttribute('aria-label') === 'Paus', 'the custom Pause label')
    await harness.pause()
    await waitFor(() => button('play').getAttribute('aria-label') === 'Spela', 'the custom Play label')
  })

  it('disables every transport button while exporting', async () => {
    await openEditing()
    await harness.waitForPlaying()
    expect(transportButtons().length).toBeGreaterThanOrEqual(2)
    expect(transportButtons().every((b) => !b.disabled)).toBe(true)
    part<HTMLButtonElement>('.splice-export-button').click()
    await waitFor(() => harness.state === 'exporting' && transportButtons().every((b) => b.disabled), 'the transport disabled')
    await waitFor(() => part('.splice-cancel') !== null, 'the cancel button')
    part<HTMLButtonElement>('.splice-cancel').click()
    await waitFor(() => harness.state === 'editing' && transportButtons().every((b) => !b.disabled), 'the transport enabled again')
  })
})
