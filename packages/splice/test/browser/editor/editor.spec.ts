import { afterEach, describe, expect, inject, it, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import opusUrl from '@test/browser/media/flower-opus.mp4?url'
import { override } from '@munsonlabs/sigil'
import type { EditorErrorDetail, EditorExportDetail } from '@/types/editor'
import { EditorHarness, sleep, waitFor } from '@test/browser/editor-harness'

// A short range on the 5s fixture, so both handles have room to move; and a quick stall.
vi.mock('@/editor/labels', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/editor/labels')>()),
  CLIP_LENGTH: 2,
  LONGEST_CLIP: 3,
}))
vi.mock('@/constants', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/constants')>()), STALL_TIMEOUT: 1 }))

/** Lets Vue render what the last event changed, as it does between real events. */
const tick = () => sleep(0)

const origin = { url: 'https://example.com/watch/flower', title: 'A flower opens', publisher: 'Example News' }
const server = inject('logoServer')
const harness = new EditorHarness()
const part = <T extends Element = HTMLElement>(selector: string) => harness.part<T>(selector)
const of = (type: string) => harness.of(type)
const errors = () => of('error').map((event) => event.detail as EditorErrorDetail)
const video = () => harness.video()
const mount = (props: Record<string, unknown> = {}) => harness.mount({ origin, ...props })
const openEditing = (props: Record<string, unknown> = {}) => harness.open({ origin, ...props })
const editorStatus = () => part('.splice-editor-status')

afterEach(() => {
  harness.cleanup()
  vi.restoreAllMocks()
})

describe('<SpliceEditor>', () => {
  it('loads the core only when it opens', async (ctx) => {
    const isLoaded = () => performance.getEntriesByType('resource').some((entry) => /mediabunny/.test(entry.name))
    if (isLoaded()) {
      console.log('SPLICE_EDITOR mediabunny was already loaded by an earlier spec in this page; lazy check skipped')
      return ctx.skip()
    }
    const editor = await mount()
    await sleep(200)
    expect(isLoaded()).toBe(false)
    editor.show()
    await waitFor(() => harness.state === 'editing', 'the editor')
    expect(isLoaded()).toBe(true)
  })

  it('opens inline around the player’s current time, with slider semantics on both handles', async () => {
    await openEditing()
    expect(of('update:open').map((event) => event.detail)).toEqual([true])
    expect(harness.range).toEqual({ start: 1.3, end: 3.3 })
    // The page's player is the preview: it loops the range, and the panel has no video of its own.
    expect(harness.player.clipRange).toEqual({ start: 1.3, end: 3.3 })
    expect(part('.splice-editor').querySelector('video')).toBeNull()

    const start = part('.splice-handle[data-handle="start"]')
    const end = part('.splice-handle[data-handle="end"]')
    expect(start.getAttribute('role')).toBe('slider')
    expect(start.getAttribute('aria-label')).toBe('Clip start')
    expect(start.getAttribute('aria-valuetext')).toBe('0:01.3')
    expect(Number(end.getAttribute('aria-valuemax'))).toBeCloseTo(5.05, 1)
    // The crop window is drawn over the player's picture, inside its shell.
    expect(part('.splice-crop').getAttribute('role')).toBe('slider')
    expect(harness.player.contains(part('.splice-crop'))).toBe(true)
    expect(part('.splice-times').textContent).toContain('2s')
  })

  it('moves the handles from the keyboard, within the shortest and longest clip', async () => {
    await openEditing()
    const start = part('.splice-handle[data-handle="start"]')
    const end = part('.splice-handle[data-handle="end"]')

    start.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(harness.range.start).toBe(1.8)
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
    expect(harness.range.start).toBe(2.3) // stops 1s (the shortest clip) before the end
    await userEvent.keyboard('{Home}')
    expect(harness.range.start).toBe(0.3) // the longest clip is 3s

    end.focus()
    await userEvent.keyboard('{End}')
    expect(harness.range).toEqual({ start: 0.3, end: 3.3 })
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(harness.range.end).toBe(2.3)
    expect(harness.player.clipRange).toEqual({ start: 0.3, end: 2.3 })
  })

  it('drags a handle and slides the selection with the pointer', async () => {
    await openEditing()
    const box = part('.splice-timeline').getBoundingClientRect()
    const toX = (time: number) => box.left + (time / 5.055) * box.width
    const pointer = (target: Element, type: string, time: number) =>
      target.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, clientX: toX(time), clientY: box.top + 10, pointerId: 7 }))

    const end = part('.splice-handle[data-handle="end"]')
    pointer(end, 'pointerdown', 3.3)
    pointer(end, 'pointermove', 4)
    pointer(end, 'pointerup', 4)
    await tick()
    expect(harness.range.end).toBeCloseTo(4, 1)

    const selection = part('.splice-selection')
    const before = harness.range
    pointer(selection, 'pointerdown', 2)
    pointer(selection, 'pointermove', 1)
    pointer(selection, 'pointerup', 1)
    await tick()
    expect(harness.range.start).toBeCloseTo(before.start - 1, 1)
    expect(harness.range.end - harness.range.start).toBeCloseTo(before.end - before.start, 5)
  })

  it('moves the crop window with the arrow keys and by dragging', async () => {
    await openEditing()
    const crop = part('.splice-crop')
    const left = () => Number.parseFloat(crop.style.left)
    // A 16:9 picture: the 9:16 window is about 31.6% of its width, centred.
    expect(Number.parseFloat(crop.style.width)).toBeCloseTo(31.64, 0)
    expect(left()).toBeCloseTo(34.18, 0)

    crop.focus()
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(harness.cropFocus).toBeCloseTo(0.4, 5)
    await waitFor(() => left() < 30, 'the window to follow the keys')
    await userEvent.keyboard('{Home}')
    await waitFor(() => left() === 0, 'the window at the left edge')
    expect(crop.getAttribute('aria-valuetext')).toContain('left of centre')

    // The window follows the pointer: dragging it right moves the focus right.
    const box = crop.getBoundingClientRect()
    const before = harness.cropFocus
    const at = (clientX: number) => ({ bubbles: true, clientX, clientY: box.top + 50, pointerId: 3 })
    crop.dispatchEvent(new PointerEvent('pointerdown', at(box.left + 10)))
    crop.dispatchEvent(new PointerEvent('pointermove', at(box.left + 110)))
    crop.dispatchEvent(new PointerEvent('pointerup', at(box.left + 110)))
    await waitFor(() => harness.cropFocus > before + 0.05, 'the focus to follow the drag')
    await waitFor(() => left() > 5, 'the window to follow the drag')
  })

  it('exports the selected range with the crop and an end card, then offers it', async () => {
    await openEditing()
    part<HTMLButtonElement>('.splice-export-button').click()
    await waitFor(() => harness.state === 'exporting', 'the export to start')
    // The window stays but can't be moved while the encoder reads the range.
    await waitFor(() => part('.splice-crop')?.getAttribute('aria-disabled') === 'true', 'the crop window to lock')
    await waitFor(() => part('.splice-progress') !== null, 'the progress bar')
    expect(part('.splice-bar').getAttribute('role')).toBe('progressbar')
    await waitFor(() => of('export').length > 0, 'the export', 60_000)

    const detail = of('export')[0].detail as EditorExportDetail
    expect(detail).toMatchObject({ start: 1.3, end: 3.3, link: 'https://example.com/watch/flower#ml-t=1.3,3.3' })
    const { probe } = await import('@test/browser/helpers')
    const probed = await probe(detail.blob)
    expect(probed.video).toMatchObject({ width: 1080, height: 1920 })
    expect(Math.abs(probed.duration - (2 + 2.5))).toBeLessThan(0.2)
    // The player was muted throughout; that's the page's business, not the clip's.
    expect(video().muted).toBe(true)
    expect(probed.audio).not.toBeNull()

    await waitFor(() => harness.state === 'done', 'the finished clip')
    expect(part('.splice-result')).not.toBeNull()
    expect(part<HTMLAnchorElement>('a.splice-download').download).toBe('a-flower-opens-1-3.mp4')
    expect(document.activeElement).toBe(part('.splice-share'))
  })

  it('cancels an export and goes back to editing', async () => {
    await openEditing()
    part<HTMLButtonElement>('.splice-export-button').click()
    await waitFor(() => part('.splice-cancel') !== null, 'the cancel button')
    part<HTMLButtonElement>('.splice-cancel').click()
    await waitFor(() => harness.state === 'editing', 'the editor again')
    expect(editorStatus().textContent).toBe('Export cancelled.')
    expect(part<HTMLButtonElement>('.splice-export-button').disabled).toBe(false)
    await sleep(300)
    expect(of('export')).toHaveLength(0)
  })

  it('goes back to editing when the cancel lands while the clip is being finalised', async () => {
    const editor = await openEditing()
    // Imported here, not at the top: the first spec checks that Mediabunny loads only on opening.
    const { Output } = await import('mediabunny')
    const finalize = Output.prototype.finalize
    // The last moment a cancel can land: every frame is encoded and the file is being written out.
    vi.spyOn(Output.prototype, 'finalize').mockImplementation(function (this: InstanceType<typeof Output>) {
      editor.cancel()
      return finalize.call(this)
    })
    part<HTMLButtonElement>('.splice-export-button').click()
    await waitFor(() => editorStatus()?.textContent === 'Export cancelled.' || of('export').length > 0, 'the export to end either way', 60_000)
    expect(of('export')).toHaveLength(0)
    expect(harness.state).toBe('editing')
    expect(part<HTMLButtonElement>('.splice-export-button').disabled).toBe(false)
  })

  it('shows a stalled export as an error, goes back to editing and exports again once the encoder works', { timeout: 60_000 }, async () => {
    await openEditing()
    const { stallVideoEncoders } = await import('@test/browser/helpers')
    const stall = stallVideoEncoders('flush')
    part<HTMLButtonElement>('.splice-export-button').click()
    await waitFor(() => errors().length > 0, 'the stall to be reported', 30_000).finally(() => stall.restore())

    expect(errors()[0]).toMatchObject({ fatal: true, message: expect.stringContaining('stopped responding') })
    await waitFor(() => harness.state === 'editing', 'the editor again')
    expect(editorStatus().textContent).toContain('stopped responding')
    expect(editorStatus().dataset.kind).toBe('error')
    expect(part<HTMLButtonElement>('.splice-export-button').disabled).toBe(false)
    expect(of('export')).toHaveLength(0)
    expect(stall.made.every(({ encoder }) => encoder.state === 'closed')).toBe(true)

    await harness.export()
    expect(harness.state).toBe('done')
  })

  it('falls back to downloading where files can’t be shared', async () => {
    await openEditing()
    await harness.export()
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    part<HTMLButtonElement>('.splice-share').click()
    await waitFor(() => click.mock.calls.length > 0, 'the download')
    delete (navigator as { canShare?: unknown }).canShare
  })

  it('shares the file and the deep link where the Web Share API takes files', async () => {
    await openEditing()
    await harness.export()
    const share = vi.fn(async (_data: ShareData) => {})
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })

    part<HTMLButtonElement>('.splice-share').click()
    await waitFor(() => share.mock.calls.length > 0, 'the share')
    const data = share.mock.calls[0][0]
    expect(data.url).toBe('https://example.com/watch/flower#ml-t=1.3,3.3')
    expect(data.title).toBe('A flower opens')
    expect(data.files?.[0]).toBeInstanceOf(File)
    expect(data.files?.[0].type).toMatch(/^video\//)

    delete (navigator as { canShare?: unknown }).canShare
    delete (navigator as { share?: unknown }).share
  })

  it('copies the link back to the moment, and says so', async () => {
    await openEditing()
    await harness.export()
    const writeText = vi.fn(async (_text: string) => {})
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })

    part<HTMLButtonElement>('.splice-copy').click()
    await waitFor(() => part('.splice-copy-status').textContent === 'Copied', 'the announcement')
    expect(writeText).toHaveBeenCalledWith('https://example.com/watch/flower#ml-t=1.3,3.3')
    expect(part('.splice-copy-status').getAttribute('aria-live')).toBe('polite')

    writeText.mockRejectedValueOnce(new DOMException('Write permission denied.', 'NotAllowedError'))
    part<HTMLButtonElement>('.splice-copy').click()
    await waitFor(() => part('.splice-copy-status').textContent === 'Could not copy the link.', 'the failure')
    delete (navigator as { clipboard?: unknown }).clipboard
  })

  it('shows the logo toggle only with a stamp, previewing it in the crop window', async () => {
    const editor = await openEditing()
    expect(part('input[name="logo"]')).toBeNull()
    editor.close()
    await waitFor(() => harness.state === 'closed', 'the editor to close')

    harness.props.stamp = { logo: `${server}/red-cors.png`, position: 'top-left', opacity: 1 }
    editor.show()
    await waitFor(() => harness.state === 'editing', 'the editor')
    const toggle = part<HTMLInputElement>('input[name="logo"]')
    expect(toggle.closest('label')!.textContent).toContain('Logo on the clip')
    expect(toggle.checked).toBe(true)

    // The stamp is painted in the window's top-left corner.
    const canvas = part<HTMLCanvasElement>('.splice-crop canvas.splice-preview')
    const redAt = () => {
      const [r, g, b] = canvas.getContext('2d')!.getImageData(Math.round(canvas.width * 0.12), Math.round(canvas.height * 0.15), 1, 1).data
      return r > 180 && g < 90 && b < 90
    }
    await waitFor(redAt, 'the stamp preview')
    toggle.click()
    await waitFor(() => !redAt(), 'the stamp to go')
  })

  it('stamps the logo on the clip and heads the end card with it', async () => {
    await openEditing({ stamp: { logo: `${server}/red-cors.png`, opacity: 1 }, endCard: { duration: 0.5, logo: `${server}/red-cors.png` } })
    const blob = await harness.export()
    expect(errors()).toEqual([])
    expect(part('.splice-warning')).toBeNull()

    const { colourAt, pixelsAt } = await import('@test/browser/helpers')
    const { STAMP_MARGINS, STAMP_SIZE } = await import('@/constants')
    const side = Math.round(STAMP_SIZE * 1080)
    const x = 1080 - Math.round(STAMP_MARGINS['top-right'].x * 1080) - side / 2
    const y = Math.round(STAMP_MARGINS['top-right'].y * 1920) + side / 2
    const [r, g, b] = colourAt(await pixelsAt(blob, 1), x, y, 20)
    expect(r).toBeGreaterThan(180)
    expect(g + b).toBeLessThan(180)
  })

  it('exports without a logo that can’t be loaded, with a non-fatal error and a note', async () => {
    await openEditing({ stamp: { logo: `${server}/red.png` } })
    await harness.export()
    expect(of('export')).toHaveLength(1)
    expect(errors()).toEqual([{ fatal: false, message: expect.stringContaining('red.png') }])
    expect(part('.splice-warning').textContent).toContain('The stamp is left out')
  })

  it('notes a silent clip on the finished clip with a non-fatal error', async () => {
    const { canEncodeAudio } = await import('mediabunny')
    const hasAacEncoder = await canEncodeAudio('aac', { sampleRate: 48_000, numberOfChannels: 2 })
    await harness.open({ origin, endCard: false }, { src: opusUrl, time: 1 })
    await harness.export()
    const silent = errors().filter((error) => error.message.includes('audio is left out'))
    expect(silent).toHaveLength(hasAacEncoder ? 0 : 1)
    if (!hasAacEncoder) expect(part('.splice-warning').textContent).toContain('The audio is left out')
  })

  it('reports a source that can’t be spliced instead of throwing, leaving the player alone', async () => {
    const notVideo = URL.createObjectURL(new Blob(['not a video'], { type: 'text/plain' }))
    const editor = await mount({ source: notVideo })
    editor.show()
    await waitFor(() => errors().length > 0, 'the error')
    expect(errors()[0]).toMatchObject({ fatal: true })
    expect(harness.state).toBe('blocked')
    expect(part<HTMLButtonElement>('.splice-export-button').disabled).toBe(true)
    expect(editorStatus().dataset.kind).toBe('error')
    expect(part('.splice-crop')).toBeNull()
    expect(harness.player.clipRange).toBeNull()
    URL.revokeObjectURL(notVideo)
  })

  it('reports a page with no player to clip', async () => {
    const editor = await mount({ player: null, for: 'no-such-player' })
    editor.show()
    await waitFor(() => errors().length > 0, 'the error')
    expect(errors()[0]).toMatchObject({ fatal: true, message: expect.stringContaining('no player') })
    expect(harness.state).toBe('blocked')
  })

  it('hides the player’s HUD while the editor is open, the panel’s controls standing in', async () => {
    const hud = () => harness.player.querySelector('.overlay__hud')
    const editor = await mount()
    await waitFor(() => Boolean(hud()), 'the HUD before opening')
    editor.show()
    await waitFor(() => harness.state === 'editing', 'the editor')
    await waitFor(() => hud() === null, 'the HUD to go')
    expect(harness.player.hasControls).toBe(false)
    expect(part('.splice-transport .ml-video-play-button')).not.toBeNull()
    editor.close()
    await waitFor(() => Boolean(hud()), 'the HUD to come back')
    expect(harness.player.hasControls).toBe(true)
  })

  it('closes from its button, the open prop and close(), giving the player back', async () => {
    const editor = await openEditing()
    part<HTMLButtonElement>('.splice-close').click()
    await waitFor(() => harness.state === 'closed', 'the close button to close')
    expect(of('update:open').map((event) => event.detail)).toEqual([true, false])
    expect(part('.splice-crop')).toBeNull()
    expect(harness.player.clipRange).toBeNull()
    await waitFor(() => video().paused, 'the player to be left paused')

    harness.props.open = true
    await waitFor(() => harness.state === 'editing', 'the open prop to open it')
    expect(harness.player.clipRange).toEqual(harness.range)
    harness.props.open = false
    await waitFor(() => harness.state === 'closed', 'the open prop to close it')

    editor.show()
    editor.close()
    editor.show()
    await waitFor(() => harness.state === 'editing', 'a close then a show at once to leave it open')
    await sleep(100)
    expect(harness.state).toBe('editing')
    expect(harness.player.clipRange).toEqual(harness.range)
  })

  it('clips the source it’s given rather than the player’s own file', async () => {
    const editor = await harness.mount({ origin }, { src: opusUrl, time: 1 })
    harness.props.source = new URL(flowerUrl, location.href).href
    editor.show()
    await waitFor(() => harness.state === 'editing', 'the editor')
    // The 5s file, not the player's 3s one.
    expect(Number(part('.splice-handle[data-handle="end"]').getAttribute('aria-valuemax'))).toBeGreaterThan(4.5)
  })

  it('takes its labels from the labels prop', async () => {
    await openEditing({ labels: { title: 'Make a short', export: 'Render' } })
    expect(part('.splice-title').textContent).toBe('Make a short')
    expect(part('.splice-export-button').textContent!.trim()).toBe('Render')
    expect(part('input[name="endcard"]').closest('label')!.textContent).toContain('End card with a link back')
  })

  it('leaves the end card out, and its toggle, for endCard: false', async () => {
    await openEditing({ endCard: false })
    expect(part('input[name="endcard"]')).toBeNull()
    const { probe } = await import('@test/browser/helpers')
    expect(Math.abs((await probe(await harness.export())).duration - 2)).toBeLessThan(0.2)
  })

  it('draws the close button with the player’s sigil icons, which a page can override in the mlv library', async () => {
    await openEditing()
    const close = part<HTMLButtonElement>('.splice-close')
    expect(close.querySelector('svg path')!.getAttribute('d')).toMatch(/^M19 6.41/)
    override('close', '<svg viewBox="0 0 24 24" data-custom="yes"><circle cx="12" cy="12" r="8"/></svg>', { library: 'mlv' })
    await waitFor(() => close.querySelector('svg')?.getAttribute('data-custom') === 'yes', 'the override').finally(() =>
      override('close', null, { library: 'mlv' }),
    )
    await waitFor(() => close.querySelector('svg path')?.getAttribute('d')?.startsWith('M19 6.41') === true, 'the built-in icon back')
  })
})
