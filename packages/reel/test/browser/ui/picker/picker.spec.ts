import { afterEach, beforeEach, describe, expect, inject, it, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import opusUrl from '@test/browser/media/flower-opus.mp4?url'
import { setPickerDefaults, type ReelCopyDetail, type ReelErrorDetail, type ReelExportDetail, type ReelPickerElement } from '@/elements'
import { override } from '@munsonlabs/sigil'
import { PickerHarness, sampleTimes, sleep, waitFor } from '@test/browser/picker-harness'

/** Lets Vue render what the last event changed, as it does between real events. */
const tick = () => sleep(0)

const origin = { url: 'https://example.com/watch/flower', title: 'A flower opens', publisher: 'Example News' }
const server = inject('logoServer')
const harness = new PickerHarness()
const part = <T extends Element = HTMLElement>(selector: string) => harness.part<T>(selector)
const of = (type: string) => harness.of(type)
const video = () => harness.video()
const mount = (props: Partial<ReelPickerElement> = {}) => harness.mount({ origin, ...props })
const openEditing = (props: Partial<ReelPickerElement> = {}) => harness.open({ origin, ...props })
const editorStatus = () => part('.reel-editor-status')

beforeEach(() => {
  // A short range on the 5s fixture, so both handles have room to move.
  setPickerDefaults({ length: 2, longest: 3 })
})

afterEach(() => {
  harness.cleanup()
  vi.restoreAllMocks()
})

describe('<ml-reel-picker>', () => {
  it('loads the core only when it opens', async (ctx) => {
    const loaded = () => performance.getEntriesByType('resource').some((entry) => /mediabunny/.test(entry.name))
    if (loaded()) {
      console.log('REEL_PICKER mediabunny was already loaded by an earlier spec in this page; lazy check skipped')
      ctx.skip()
      return
    }
    const picker = await mount()
    await sleep(200)
    expect(loaded()).toBe(false)
    picker.show()
    await waitFor(() => picker.state === 'editing', 'the editor')
    expect(loaded()).toBe(true)
  })

  it('opens inline around the player’s current time, with slider semantics on both handles', async () => {
    const picker = await openEditing()
    expect(of('reel-open')).toHaveLength(1)
    expect(picker.hasAttribute('open')).toBe(true)
    await waitFor(() => picker.dataset.state === 'editing', 'data-state')
    expect(picker.range).toEqual({ start: 1.3, end: 3.3 })
    // The page's player is the preview: it loops the range, and the picker's panel sits where the page put it.
    expect(harness.player.clipRange).toEqual({ start: 1.3, end: 3.3 })
    expect(picker.parentElement).toBe(document.body)
    expect(picker.querySelector('video')).toBeNull()
    expect(picker.querySelector('dialog')).toBeNull()

    const start = part('.reel-handle[data-handle="start"]')
    const end = part('.reel-handle[data-handle="end"]')
    expect(start.getAttribute('role')).toBe('slider')
    expect(start.getAttribute('aria-label')).toBe('Clip start')
    expect(start.getAttribute('aria-valuenow')).toBe('1.3')
    expect(start.getAttribute('aria-valuetext')).toBe('0:01.3')
    expect(Number(end.getAttribute('aria-valuemax'))).toBeCloseTo(5.05, 1)
    // The crop window is drawn over the player's picture, inside its shell.
    expect(part('.reel-crop').getAttribute('role')).toBe('slider')
    expect(harness.player.contains(part('.reel-crop'))).toBe(true)
    expect(picker.contains(part('.reel-crop'))).toBe(false)
    expect(part('.reel-times').textContent).toContain('2s')
  })

  it('moves the handles from the keyboard, within the shortest and longest clip', async () => {
    const picker = await openEditing()
    const start = part('.reel-handle[data-handle="start"]')
    const end = part('.reel-handle[data-handle="end"]')

    start.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(picker.range.start).toBe(1.8)
    expect(start.getAttribute('aria-valuenow')).toBe('1.8')
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
    expect(picker.range.start).toBe(2.3) // stops 1s (the shortest clip) before the end
    await userEvent.keyboard('{Home}')
    expect(picker.range.start).toBe(0.3) // the longest clip is 3s

    end.focus()
    await userEvent.keyboard('{End}')
    expect(picker.range).toEqual({ start: 0.3, end: 3.3 })
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(picker.range.end).toBe(2.3)
    expect(of('reel-range').length).toBeGreaterThan(3)
    expect(of('reel-range').at(-1)!.detail).toEqual({ start: 0.3, end: 2.3 })
  })

  it('drags a handle and slides the selection with the pointer', async () => {
    const picker = await openEditing()
    const timeline = part('.reel-timeline')
    const box = timeline.getBoundingClientRect()
    const x = (time: number) => box.left + (time / 5.055) * box.width
    const pointer = (target: Element, type: string, time: number) =>
      target.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, clientX: x(time), clientY: box.top + 10, pointerId: 7 }))

    const end = part('.reel-handle[data-handle="end"]')
    pointer(end, 'pointerdown', 3.3)
    pointer(end, 'pointermove', 4)
    pointer(end, 'pointerup', 4)
    expect(picker.range.end).toBeCloseTo(4, 1)
    await tick()

    const selection = part('.reel-selection')
    const before = picker.range
    pointer(selection, 'pointerdown', 2)
    pointer(selection, 'pointermove', 1)
    pointer(selection, 'pointerup', 1)
    expect(picker.range.start).toBeCloseTo(before.start - 1, 1)
    expect(picker.range.end - picker.range.start).toBeCloseTo(before.end - before.start, 5)
  })

  it('moves the crop window with the arrow keys and by dragging', async () => {
    const picker = await openEditing()
    const crop = part('.reel-crop')
    const left = () => Number.parseFloat(crop.style.left)
    // A 16:9 picture: the 9:16 window is about 31.6% of its width, centred.
    expect(Number.parseFloat(crop.style.width)).toBeCloseTo(31.64, 1)
    expect(left()).toBeCloseTo(34.18, 1)
    crop.focus()
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(picker.cropFocus.x).toBeCloseTo(0.4, 5)
    expect(crop.getAttribute('aria-valuenow')).toBe('40')
    await waitFor(() => left() < 30, 'the window to follow the keys')
    await userEvent.keyboard('{Home}')
    await waitFor(() => crop.style.left === '0%', 'the window at the left edge')
    expect(crop.getAttribute('aria-valuetext')).toContain('left of centre')

    // The window follows the pointer: dragging it right moves the focus right.
    const box = crop.getBoundingClientRect()
    const before = picker.cropFocus.x
    const at = (clientX: number) => ({ bubbles: true, clientX, clientY: box.top + 50, pointerId: 3 })
    crop.dispatchEvent(new PointerEvent('pointerdown', at(box.left + 10)))
    crop.dispatchEvent(new PointerEvent('pointermove', at(box.left + 110)))
    crop.dispatchEvent(new PointerEvent('pointerup', at(box.left + 110)))
    expect(picker.cropFocus.x).toBeGreaterThan(before + 0.05)
    await waitFor(() => left() > 5, 'the window to follow the drag')
  })

  it('exports the selected range with the crop and an end card, then offers it', async () => {
    const picker = await openEditing()
    part<HTMLButtonElement>('.reel-export-button').click()
    expect(picker.state).toBe('exporting')
    // The window stays but cannot be moved while the encoder reads the range.
    await waitFor(() => part('.reel-crop')?.getAttribute('aria-disabled') === 'true', 'the crop window to lock')
    await waitFor(() => part('.reel-progress') !== null, 'the progress bar')
    expect(part('.reel-bar').getAttribute('role')).toBe('progressbar')
    await waitFor(() => of('reel-export').length > 0, 'the export')

    const detail = of('reel-export')[0].detail as ReelExportDetail
    expect(detail).toMatchObject({ start: 1.3, end: 3.3, link: 'https://example.com/watch/flower#ml-t=1.3,3.3' })
    const { probe } = await import('@test/browser/helpers')
    const probed = await probe(detail.blob)
    expect(probed.video).toMatchObject({ width: 1080, height: 1920 })
    expect(Math.abs(probed.duration - (2 + 2.5))).toBeLessThan(0.2)
    // The player was muted throughout; that is the page's business, not the clip's.
    expect(video().muted).toBe(true)
    expect(probed.audio).not.toBeNull()

    expect(picker.state).toBe('done')
    expect(part('.reel-result')).not.toBeNull()
    expect(part<HTMLAnchorElement>('a.reel-download').download).toBe('a-flower-opens-1-3.mp4')
    expect(document.activeElement).toBe(part('.reel-share'))
  })

  it('cancels an export and goes back to editing', async () => {
    const picker = await openEditing()
    part<HTMLButtonElement>('.reel-export-button').click()
    await waitFor(() => part('.reel-cancel') !== null, 'the cancel button')
    expect(picker.state).toBe('exporting')
    part<HTMLButtonElement>('.reel-cancel').click()
    await waitFor(() => of('reel-cancel').length > 0, 'the cancel')
    expect(picker.state).toBe('editing')
    expect(editorStatus().textContent).toBe('Export cancelled.')
    expect(part<HTMLButtonElement>('.reel-export-button').disabled).toBe(false)
    await sleep(300)
    expect(of('reel-export')).toHaveLength(0)
  })

  it('goes back to editing when the cancel lands while the clip is being finalised', async () => {
    const picker = await openEditing()
    // Imported here, not at the top: the first spec checks that Mediabunny loads only on opening.
    const { Output } = await import('mediabunny')
    const finalize = Output.prototype.finalize
    // The last moment a cancel can land: every frame is encoded and the file is being written out.
    // It used to leave the dialog in 'exporting' for good, with no reel-cancel (a Firefox flake).
    vi.spyOn(Output.prototype, 'finalize').mockImplementation(function (this: InstanceType<typeof Output>) {
      picker.cancel()
      return finalize.call(this)
    })
    part<HTMLButtonElement>('.reel-export-button').click()
    await waitFor(() => of('reel-cancel').length > 0 || of('reel-export').length > 0, 'the export to end either way')
    expect(of('reel-cancel')).toHaveLength(1)
    expect(of('reel-export')).toHaveLength(0)
    expect(picker.state).toBe('editing')
    expect(editorStatus().textContent).toBe('Export cancelled.')
    expect(part<HTMLButtonElement>('.reel-export-button').disabled).toBe(false)
  })

  it('shows a stalled export as an error with a retry, fires reel-error and never stays exporting', { timeout: 60_000 }, async () => {
    setPickerDefaults({ stallTimeout: 1 })
    const picker = await openEditing()
    const { canEncodeVideo, QUALITY_HIGH } = await import('mediabunny')
    const { stallVideoEncoders } = await import('@test/browser/helpers')
    // Mediabunny's probe for the software retry, answered before the encoders stall (Firefox probes
    // by encoding a frame).
    await canEncodeVideo('avc', { width: 1080, height: 1920, quality: QUALITY_HIGH, hardwareAcceleration: 'prefer-software' })
    const stall = stallVideoEncoders('flush')
    try {
      part<HTMLButtonElement>('.reel-export-button').click()
      expect(picker.state).toBe('exporting')
      await waitFor(() => of('reel-error').length > 0, 'the stall to be reported', 30_000)
      const detail = of('reel-error')[0].detail as ReelErrorDetail
      expect(detail).toMatchObject({ reason: 'encoder-stalled', fatal: true, message: expect.stringContaining('try again') })
      await waitFor(() => picker.state === 'editing', 'the editor again')
      expect(editorStatus().textContent).toBe('The export stalled. Try again.')
      expect(editorStatus().dataset.kind).toBe('error')
      const retry = part<HTMLButtonElement>('.reel-export-button')
      expect(retry.textContent?.trim()).toBe('Try again')
      expect(retry.disabled).toBe(false)
      expect(of('reel-export')).toHaveLength(0)
      expect(stall.made.every(({ encoder }) => encoder.state === 'closed')).toBe(true)
    } finally {
      stall.restore()
      setPickerDefaults({ stallTimeout: undefined })
    }
    // Trying again with an encoder that works makes the clip, and the button is itself again.
    part<HTMLButtonElement>('.reel-export-button').click()
    await waitFor(() => of('reel-export').length > 0, 'the retried export', 30_000)
    expect(picker.state).toBe('done')
    part<HTMLButtonElement>('.reel-again').click()
    await waitFor(() => picker.state === 'editing', 'the editor after the clip')
    expect(part('.reel-export-button').textContent?.trim()).toBe('Export clip')
  })

  it('falls back to downloading where files cannot be shared', async () => {
    const picker = await openEditing()
    await harness.export()
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    try {
      await expect(picker.share()).resolves.toBe('downloaded')
      expect(click).toHaveBeenCalledTimes(1)
      expect(of('reel-download')).toHaveLength(1)
      expect(of('reel-share')).toHaveLength(0)
    } finally {
      delete (navigator as { canShare?: unknown }).canShare
    }
  })

  it('shares the file and the deep link where the Web Share API takes files', async () => {
    await openEditing()
    await harness.export()
    const share = vi.fn(async (_data: ShareData) => {})
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    try {
      part<HTMLButtonElement>('.reel-share').click()
      await waitFor(() => of('reel-share').length > 0, 'the share')
      const data = share.mock.calls[0][0]
      expect(data.url).toBe('https://example.com/watch/flower#ml-t=1.3,3.3')
      expect(data.text).toBe('A flower opens\n\nhttps://example.com/watch/flower#ml-t=1.3,3.3')
      expect(data.files?.[0]).toBeInstanceOf(File)
      expect(data.files?.[0].type).toMatch(/^video\//)
    } finally {
      delete (navigator as { canShare?: unknown }).canShare
      delete (navigator as { share?: unknown }).share
    }
  })

  it('shows the logo toggle only when a logo is configured, with the stamp previewed', async () => {
    const picker = await openEditing()
    expect(part('input[name="logo"]')).toBeNull()
    picker.close()

    setPickerDefaults({ logo: `${server}/red-cors.png`, stamp: { position: 'top-left' } })
    picker.show()
    await waitFor(() => picker.state === 'editing', 'the editor')
    const toggle = part<HTMLInputElement>('input[name="logo"]')
    expect(toggle.closest('label')!.textContent).toContain('Logo on the clip')
    expect(toggle.checked).toBe(true)
    await waitFor(() => part('.reel-stamp') !== null && !part('.reel-stamp').hidden, 'the stamp preview')
    expect(part('.reel-stamp').style.left).toBe('5%')
    toggle.click()
    await waitFor(() => part('.reel-stamp') === null, 'the stamp to go')
    picker.close()

    setPickerDefaults({ stamp: false })
    picker.show()
    await waitFor(() => picker.state === 'editing', 'the editor')
    expect(part<HTMLInputElement>('input[name="logo"]').checked).toBe(false)
  })

  it('stamps the configured logo and puts it and the display URL on the end card', async () => {
    const calls: unknown[] = []
    setPickerDefaults({
      logo: `${server}/red-cors.png`,
      displayUrl: 'example.com/flower',
      endCard: { duration: 0.5, draw: (_ctx, info) => calls.push(info) },
    })
    await openEditing()
    const blob = await harness.export()
    expect(calls[0]).toMatchObject({ displayUrl: 'example.com/flower' })
    expect((calls[0] as { logo: ImageBitmap | null }).logo).not.toBeNull()
    expect(of('reel-error')).toHaveLength(0)
    expect(part('.reel-warning')).toBeNull()
    const { colourAt, pixelsAt } = await import('@test/browser/helpers')
    const { planStamp } = await import('@/index')
    const box = planStamp(1080, 1920, { width: 64, height: 64 })
    const [r, g, b] = colourAt(await pixelsAt(blob, 1), box.x + box.width / 2, box.y + box.height / 2, 20)
    expect(r).toBeGreaterThan(180)
    expect(g + b).toBeLessThan(180)
  })

  it('exports without a logo that cannot be loaded, with a non-fatal reel-error and a note', async () => {
    setPickerDefaults({ logo: `${server}/red.png` })
    await openEditing()
    await harness.export()
    expect(of('reel-export')).toHaveLength(1)
    const errors = of('reel-error').map((event) => event.detail as ReelErrorDetail)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({ reason: 'logo-unavailable', fatal: false })
    expect(errors[0].message).toContain('red.png')
    expect(part('.reel-warning').textContent).toBe('The logo could not be loaded, so the clip was made without it.')
  })

  it('copies a ready-to-post caption with the deep link, and announces it', async () => {
    const picker = await openEditing()
    await harness.export()
    const writeText = vi.fn(async (_text: string) => {})
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    try {
      expect(part('.reel-copy').textContent).toBe('Copy caption with link')
      part<HTMLButtonElement>('.reel-copy').click()
      await waitFor(() => of('reel-copy').length > 0, 'the copy')
      const text = 'A flower opens\n\nhttps://example.com/watch/flower#ml-t=1.3,3.3'
      expect(writeText).toHaveBeenCalledWith(text)
      expect(of('reel-copy')[0].detail).toEqual({ text, result: 'copied' } satisfies ReelCopyDetail)
      expect(picker.shareCaption).toBe(text)
      const live = part('.reel-copy-status')
      expect(live.getAttribute('aria-live')).toBe('polite')
      await waitFor(() => live.textContent === 'Copied', 'the announcement')
      expect(part('.reel-caption-text')).toBeNull()

      setPickerDefaults({ shareCaption: '{publisher}: {title} {url}' })
      await expect(picker.copyCaption()).resolves.toBe('copied')
      expect(writeText).toHaveBeenLastCalledWith('Example News: A flower opens https://example.com/watch/flower#ml-t=1.3,3.3')
      setPickerDefaults({ shareCaption: (info) => `Watch from ${info.start}s: ${info.url}` })
      await picker.copyCaption()
      expect(writeText).toHaveBeenLastCalledWith('Watch from 1.3s: https://example.com/watch/flower#ml-t=1.3,3.3')
    } finally {
      delete (navigator as { clipboard?: unknown }).clipboard
    }
  })

  it('selects the caption in a read-only field when the clipboard is refused', async () => {
    const picker = await openEditing()
    await harness.export()
    const writeText = vi.fn(async () => {
      throw new DOMException('Write permission denied.', 'NotAllowedError')
    })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    try {
      await expect(picker.copyCaption()).resolves.toBe('selected')
      const field = part<HTMLTextAreaElement>('.reel-caption-text')
      const text = 'A flower opens\n\nhttps://example.com/watch/flower#ml-t=1.3,3.3'
      expect(field.readOnly).toBe(true)
      expect(field.value).toBe(text)
      expect(field.getAttribute('aria-label')).toBe('Caption with link')
      expect(document.activeElement).toBe(field)
      expect([field.selectionStart, field.selectionEnd]).toEqual([0, text.length])
      expect(part('.reel-copy-status').textContent).toContain('selected below')
      expect(of('reel-copy')[0].detail).toMatchObject({ result: 'selected' })
    } finally {
      delete (navigator as { clipboard?: unknown }).clipboard
    }
  })

  it('reports a source that cannot be clipped instead of throwing, leaving the player alone', async () => {
    const picker = await mount({ source: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' })
    picker.show()
    await waitFor(() => of('reel-error').length > 0, 'the error')
    expect(of('reel-error')[0].detail).toMatchObject({ reason: 'embed', fatal: true })
    expect(picker.state).toBe('blocked')
    expect(part<HTMLButtonElement>('.reel-export-button').disabled).toBe(true)
    expect(editorStatus().dataset.kind).toBe('error')
    expect(part('.reel-crop')).toBeNull()
    expect(harness.player.clipRange).toBeNull()
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('reports a page with no player to clip', async () => {
    const picker = document.createElement('ml-reel-picker') as ReelPickerElement
    picker.setAttribute('for', 'no-such-player')
    picker.addEventListener('reel-error', (event) => harness.events.push({ type: 'reel-error', detail: (event as CustomEvent).detail }))
    harness.picker = picker
    document.body.append(picker)
    picker.show()
    await waitFor(() => of('reel-error').length > 0, 'the error')
    expect(of('reel-error')[0].detail).toMatchObject({ reason: 'no-player', fatal: true })
    expect(picker.state).toBe('blocked')
  })

  it('hides the player’s HUD while the editor is open, the panel’s controls standing in', async () => {
    const hud = () => harness.player.querySelector('.overlay__hud')
    await harness.mount()
    await waitFor(() => Boolean(hud()), 'the HUD before opening')
    const picker = harness.picker
    picker.show()
    await waitFor(() => picker.state === 'editing', 'the editor')
    await waitFor(() => hud() === null, 'the HUD to go')
    expect(harness.player.hasControls).toBe(false)
    expect(part('.reel-transport .ml-video-play-button')).not.toBeNull()
    picker.close()
    await waitFor(() => Boolean(hud()), 'the HUD to come back')
    expect(harness.player.hasControls).toBe(true)
  })

  it('closes from its button, the open attribute and close(), giving the player back and firing reel-close', async () => {
    const picker = await openEditing()
    part<HTMLButtonElement>('.reel-close').click()
    await waitFor(() => picker.state === 'closed', 'the close button to close')
    expect(picker.hasAttribute('open')).toBe(false)
    expect(part('.reel-crop')).toBeNull()
    expect(harness.player.clipRange).toBeNull()
    await waitFor(() => Boolean(harness.player.querySelector('.overlay__hud')), 'the player’s HUD to come back')
    await waitFor(() => video().paused, 'the player to be left paused')

    picker.setAttribute('open', '')
    await waitFor(() => picker.state === 'editing', 'the open attribute to open it')
    expect(harness.player.clipRange).toEqual(picker.range)
    picker.removeAttribute('open')
    await waitFor(() => picker.state === 'closed', 'removing the attribute to close it')
    expect(of('reel-close')).toHaveLength(2)

    picker.show()
    picker.close()
    picker.show()
    await waitFor(() => picker.state === 'editing', 'a close then a show at once to leave it open')
    await sleep(100)
    expect(picker.state).toBe('editing')
    expect(harness.player.clipRange).toEqual(picker.range)
  })

  it('clips the file given as the src attribute rather than the player’s own', async () => {
    const picker = await harness.mount({}, { src: opusUrl, time: 1 })
    picker.setAttribute('src', new URL(flowerUrl, location.href).href)
    picker.show()
    await waitFor(() => picker.state === 'editing', 'the editor')
    // The 5s file, not the player's 3s one.
    expect(Number(part('.reel-handle[data-handle="end"]').getAttribute('aria-valuemax'))).toBeGreaterThan(4.5)
  })

  it('takes labels from the shared defaults', async () => {
    setPickerDefaults({ labels: { title: 'Make a short', export: 'Render' } })
    await openEditing()
    expect(part('.reel-title').textContent).toBe('Make a short')
    expect(part('.reel-export-button').textContent!.trim()).toBe('Render')
    expect(part('input[name="endcard"]').closest('label')!.textContent).toContain('End card with a link back')
  })
})

describe('<ml-reel-picker> playback through the page’s player', () => {
  const percent = (value: string) => Number.parseFloat(value)

  /** Where the playhead is, as a time, read back from its position on the filmstrip. */
  function playheadTime(): number {
    const max = Number(part('.reel-handle[data-handle="end"]').getAttribute('aria-valuemax'))
    return (percent(part('.reel-playhead').style.left) / 100) * max
  }

  /** Clicks the selection at `time` and waits for the preview's seek to land there. */
  async function seekAndSettle(time: number): Promise<void> {
    const box = part('.reel-timeline').getBoundingClientRect()
    const max = Number(part('.reel-handle[data-handle="end"]').getAttribute('aria-valuemax'))
    const init = { bubbles: true, composed: true, clientX: box.left + (time / max) * box.width, clientY: box.top + 10, pointerId: 9 }
    const selection = part('.reel-selection')
    selection.dispatchEvent(new PointerEvent('pointerdown', init))
    selection.dispatchEvent(new PointerEvent('pointerup', init))
    await waitFor(() => !video().seeking && Math.abs(video().currentTime - time) < 0.15, `the seek to ${time}`)
  }

  const pause = () => harness.pause()

  it('loops the range on the player, with the playhead moving inside the selection', async () => {
    const picker = await openEditing()
    await harness.playing()
    const selection = part('.reel-selection')
    const low = percent(selection.style.left)
    const high = low + percent(selection.style.width)
    const seen = new Set<string>()
    const outside: string[] = []
    const looped = (times: number[]) => times.some((time, i) => i > 0 && time < times[i - 1] - 1)
    // Every presented frame, for at least 3s and until it has looped once through the 2s selection: on
    // a loaded machine playback is slower than the wall clock, so a fixed window could miss the loop.
    const times = await sampleTimes(video(), looped, 'the preview to loop the range', {
      atLeast: 3000,
      onSample: () => {
        const playhead = part('.reel-playhead')
        if (playhead.hidden) return
        seen.add(playhead.style.left)
        const at = percent(playhead.style.left)
        if (at < low - 0.01 || at > high + 0.01) outside.push(playhead.style.left)
      },
    })
    expect(outside, 'playhead positions outside the selection').toEqual([])
    // The player checks the range's end on every presented frame, so the loop lands within a frame or two.
    expect(Math.min(...times)).toBeGreaterThanOrEqual(picker.range.start - 0.3)
    expect(Math.max(...times)).toBeLessThanOrEqual(picker.range.end + 0.1)
    expect(looped(times)).toBe(true)
    expect(seen.size).toBeGreaterThan(1)
    expect(part('.reel-playhead').getAttribute('aria-hidden')).toBe('true')

    await pause()
    await seekAndSettle(2.6)
    expect(video().currentTime - picker.range.start).toBeCloseTo(1.3, 1)
    await waitFor(() => Math.abs(playheadTime() - video().currentTime) < 0.1, 'the playhead to follow the seek')
  })

  it('leaves play and pause to the player’s controls, holding position while the handles and the crop keep their arrow keys', async () => {
    const picker = await openEditing()
    await harness.playing()
    // The player's HUD is hidden while the editor is open; its play button is the panel's.
    const play = part<HTMLButtonElement>('.reel-transport .ml-video-play-button')
    play.click()
    await waitFor(() => video().paused && !harness.player.isPlaying, 'the pause')
    await waitFor(() => !video().seeking, 'any seek to settle')
    const held = video().currentTime
    await sleep(400)
    expect(video().currentTime).toBeCloseTo(held, 3)

    const start = part('.reel-handle[data-handle="start"]')
    start.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(picker.range.start).toBe(1.8)
    part('.reel-crop').focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(picker.cropFocus.x).toBeCloseTo(0.45, 5)
    // The picker moved neither the position the viewer paused at nor the range's loop beyond the new start.
    expect(harness.player.clipRange).toEqual(picker.range)
    play.click()
    await waitFor(() => !video().paused, 'playing again')
  })

  it('seeks on a click inside the selection without moving the handles; a drag still moves the range', async () => {
    const picker = await openEditing()
    await harness.playing()
    await pause()
    const before = picker.range
    const ranges = of('reel-range').length
    await seekAndSettle(2.8)
    expect(picker.range).toEqual(before)
    expect(of('reel-range')).toHaveLength(ranges)
    await waitFor(() => Math.abs(playheadTime() - 2.8) < 0.1, 'the playhead at the click')

    // Under the drag threshold is still a click.
    const timeline = part('.reel-timeline')
    const box = timeline.getBoundingClientRect()
    const selection = part('.reel-selection')
    const at = (clientX: number) => ({ bubbles: true, composed: true, clientX, clientY: box.top + 10, pointerId: 11 })
    const x = box.left + (2 / 5.055) * box.width
    selection.dispatchEvent(new PointerEvent('pointerdown', at(x)))
    selection.dispatchEvent(new PointerEvent('pointermove', at(x + 2)))
    selection.dispatchEvent(new PointerEvent('pointerup', at(x + 2)))
    expect(picker.range).toEqual(before)
    await waitFor(() => !video().seeking && Math.abs(video().currentTime - 2) < 0.1, 'the seek to 2s')

    // Past it, the range moves, and the playhead hides while it does.
    await waitFor(() => !part('.reel-playhead').hidden, 'the playhead')
    selection.dispatchEvent(new PointerEvent('pointerdown', at(x)))
    selection.dispatchEvent(new PointerEvent('pointermove', at(x - box.width * 0.1)))
    await waitFor(() => part('.reel-playhead').hidden === true, 'the playhead to hide')
    selection.dispatchEvent(new PointerEvent('pointerup', at(x - box.width * 0.1)))
    await tick()
    expect(picker.range.start).toBeLessThan(before.start)
    expect(picker.range.end - picker.range.start).toBeCloseTo(before.end - before.start, 5)

    // Dragging the playhead scrubs, inside the selection only.
    await waitFor(() => !video().seeking && !part('.reel-playhead').hidden, 'the playhead')
    const range = picker.range
    const px = (time: number) => box.left + (time / 5.055) * box.width
    const playhead = part('.reel-playhead')
    playhead.dispatchEvent(new PointerEvent('pointerdown', at(px(video().currentTime))))
    playhead.dispatchEvent(new PointerEvent('pointermove', at(px(range.start + 1))))
    await waitFor(() => !video().seeking && Math.abs(video().currentTime - (range.start + 1)) < 0.1, 'the scrub')
    playhead.dispatchEvent(new PointerEvent('pointermove', at(px(4.9))))
    await waitFor(() => !video().seeking, 'the second scrub')
    expect(video().currentTime).toBeLessThan(range.end)
    playhead.dispatchEvent(new PointerEvent('pointerup', at(px(4.9))))
    expect(picker.range).toEqual(range)
    await tick()

    // A press outside the selection does what it always did: nothing.
    const seekTo = video().currentTime
    const canvas = timeline.querySelector('canvas')!
    canvas.dispatchEvent(new PointerEvent('pointerdown', at(box.right - 2)))
    canvas.dispatchEvent(new PointerEvent('pointerup', at(box.right - 2)))
    await sleep(200)
    expect(video().currentTime).toBe(seekTo)
    expect(picker.range).toEqual(range)
  })

  it('hides the playhead while a handle is dragged, and loops the new range', async () => {
    const picker = await openEditing()
    await harness.playing()
    await waitFor(() => !part('.reel-playhead').hidden, 'the playhead')
    const box = part('.reel-timeline').getBoundingClientRect()
    const end = part('.reel-handle[data-handle="end"]')
    const at = (time: number) => ({
      bubbles: true,
      composed: true,
      clientX: box.left + (time / 5.055) * box.width,
      clientY: box.top + 10,
      pointerId: 12,
    })
    end.dispatchEvent(new PointerEvent('pointerdown', at(3.3)))
    end.dispatchEvent(new PointerEvent('pointermove', at(4)))
    await waitFor(() => part('.reel-playhead').hidden === true, 'the playhead to hide')
    end.dispatchEvent(new PointerEvent('pointerup', at(4)))
    await waitFor(() => !part('.reel-playhead').hidden, 'the playhead back')
    // The preview shows the second before the new end, then loops back to the start.
    expect(picker.range.end).toBeCloseTo(4, 1)
    await waitFor(() => video().currentTime > 3.6, 'playback near the new end')
    await waitFor(() => video().currentTime < picker.range.start + 0.5, 'the loop back to the start')
  })

  it('pauses the player while exporting and resumes it after a cancel', async () => {
    const picker = await openEditing()
    await harness.playing()
    part<HTMLButtonElement>('.reel-export-button').click()
    await waitFor(() => video().paused, 'the player to rest')
    part<HTMLButtonElement>('.reel-cancel').click()
    await waitFor(() => picker.state === 'editing' && !video().paused, 'the player to play again')
  })

  it('draws the close button with the player’s sigil icons, which a page can override in the mlv library', async () => {
    await openEditing()
    const close = part<HTMLButtonElement>('.reel-close')
    expect(close.querySelector('svg path')!.getAttribute('d')).toMatch(/^M19 6.41/)
    override('close', '<svg viewBox="0 0 24 24" data-custom="yes"><circle cx="12" cy="12" r="8"/></svg>', { library: 'mlv' })
    try {
      await waitFor(() => close.querySelector('svg')?.getAttribute('data-custom') === 'yes', 'the override')
    } finally {
      override('close', null, { library: 'mlv' })
    }
    await waitFor(() => close.querySelector('svg path')?.getAttribute('d')?.startsWith('M19 6.41') === true, 'the built-in icon back')
  })
})

describe('<ml-reel-picker> transport', () => {
  const button = (name: string) => part<HTMLButtonElement>(`.reel-transport .ml-video-${name}-button`)
  const transportButtons = () => Array.from(harness.picker.querySelectorAll<HTMLButtonElement>('.reel-transport button'))

  it('plays and pauses the page’s player, the label following', async () => {
    await openEditing()
    await harness.playing()
    await waitFor(() => button('play').getAttribute('aria-label') === 'Pause', 'the Pause label')
    button('play').click()
    await waitFor(() => video().paused && !harness.player.isPlaying, 'the player to pause')
    await waitFor(() => button('play').getAttribute('aria-label') === 'Play', 'the Play label')
    button('play').click()
    await waitFor(() => !video().paused && harness.player.isPlaying, 'the player to play again')
    await waitFor(() => button('play').getAttribute('aria-label') === 'Pause', 'the Pause label again')
  })

  it('reads the time from the start of the clip', async () => {
    await openEditing()
    await harness.pause()
    await harness.seekTo(2.3)
    const clock = () => part('.reel-clock').textContent!.replace(/\s+/g, ' ').trim()
    await waitFor(() => /^0:0[0-2] \/ 0:02$/.test(clock()), 'a clip-relative time', 20_000, clock)
  })

  it('mutes and unmutes the player', async () => {
    await openEditing()
    await waitFor(() => button('mute').getAttribute('aria-label') === (harness.player.isMuted ? 'Unmute' : 'Mute'), 'the mute label')
    const was = harness.player.isMuted
    button('mute').click()
    await waitFor(() => harness.player.isMuted === !was, 'the toggled mute')
    await waitFor(() => button('mute').getAttribute('aria-label') === (was ? 'Mute' : 'Unmute'), 'the flipped label')
    button('mute').click()
    await waitFor(() => harness.player.isMuted === was, 'the mute restored')
  })

  it('takes its labels from the shared defaults', async () => {
    setPickerDefaults({ labels: { play: 'Spela', pause: 'Paus' } })
    await openEditing()
    await harness.playing()
    await waitFor(() => button('play').getAttribute('aria-label') === 'Paus', 'the custom Pause label')
    await harness.pause()
    await waitFor(() => button('play').getAttribute('aria-label') === 'Spela', 'the custom Play label')
  })

  it('disables every transport button while exporting', async () => {
    const picker = await openEditing()
    await harness.playing()
    expect(transportButtons().length).toBeGreaterThanOrEqual(2)
    expect(transportButtons().every((b) => !b.disabled)).toBe(true)
    part<HTMLButtonElement>('.reel-export-button').click()
    await waitFor(() => picker.state === 'exporting' && transportButtons().every((b) => b.disabled), 'the transport disabled')
    part<HTMLButtonElement>('.reel-cancel').click()
    await waitFor(() => picker.state === 'editing' && transportButtons().every((b) => !b.disabled), 'the transport enabled again')
  })
})
