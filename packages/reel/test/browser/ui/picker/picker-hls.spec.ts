import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import masterUrl from '@test/browser/media/ladder/master.m3u8?url'
import brokenUrl from '@test/browser/media/ladder/broken.m3u8?url'
import fmp4Url from '@test/browser/media/hls/flower.m3u8?url'
import { setPickerDefaults, type ReelErrorDetail, type ReelPickerElement } from '@/elements'
import { changedFraction, engine, pixelsAt } from '@test/browser/helpers'
import { PickerHarness, sleep, waitFor } from '@test/browser/picker-harness'

const isWebKit = () => engine().startsWith('webkit')
const harness = new PickerHarness()
const part = <T extends Element = HTMLElement>(selector: string) => harness.part<T>(selector)
const openEditing = (props: Partial<ReelPickerElement> = {}, src: string = masterUrl) => harness.open({ endCard: false, ...props }, { src })
const errors = () => harness.of('reel-error').map((event) => event.detail as ReelErrorDetail)
const timeline = () => part('.reel-timeline')

/**
 * How much of the band where captions are drawn differs between two clips, 0.5s in: 1.8s on the
 * source, where the ladder's "EN one" and "FR un" are up.
 */
async function captionBand(a: Blob, b: Blob): Promise<number> {
  const [first, second] = await Promise.all([pixelsAt(a, 0.5), pixelsAt(b, 0.5)])
  return changedFraction(first, second, Math.round(first.height * 0.6), Math.round(first.height * 0.95))
}

beforeEach(() => {
  setPickerDefaults({ length: 2, longest: 3 })
})

afterEach(() => {
  harness.cleanup()
  vi.restoreAllMocks()
})

describe('<ml-reel-picker> filmstrip', () => {
  it('sizes the strip with placeholders at once and paints each tile as it arrives', async () => {
    const draws: Array<{ x: number; ready: boolean }> = []
    const drawImage = CanvasRenderingContext2D.prototype.drawImage
    vi.spyOn(CanvasRenderingContext2D.prototype, 'drawImage').mockImplementation(function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      if (this.canvas === harness.picker?.querySelector('.reel-timeline canvas')) {
        draws.push({ x: args[1] as number, ready: timeline().dataset.filmstrip === 'ready' })
      }
      return (drawImage as (...rest: unknown[]) => void).apply(this, args)
    })
    await harness.mount({}, { src: masterUrl })
    harness.picker.show()
    // Vue renders the panel a tick after show().
    await sleep(0)
    const canvas = part<HTMLCanvasElement>('.reel-timeline canvas')
    const height = Math.round(64 * Math.min(2, devicePixelRatio || 1))
    // Never the default 300x150, not even before the core has loaded.
    expect(canvas.height).toBe(height)
    expect(canvas.width).toBe(Math.round(height * (16 / 9) * 10))

    await waitFor(() => timeline().dataset.filmstrip === 'ready', 'the filmstrip')
    expect(canvas.width).toBe(Math.round(height * (1280 / 720) * 10))
    expect(draws).toHaveLength(10)
    expect(new Set(draws.map((draw) => draw.x)).size).toBe(10)
    expect(
      draws.every((draw) => !draw.ready),
      'every tile painted before the storyboard finished',
    ).toBe(true)
  })

  it('keeps working without thumbnails, with a quiet note and a non-fatal reel-error', async () => {
    const picker = await harness.open({ endCard: false, source: brokenUrl })
    await waitFor(() => timeline().dataset.filmstrip === 'unavailable', 'the filmstrip to fail')
    expect(part('.reel-notes').textContent).toContain('Thumbnails unavailable')
    expect(errors().find((error) => error.reason === 'thumbnails-unavailable')).toMatchObject({ fatal: false })
    expect(picker.state).toBe('editing')
    expect(part('.reel-editor-status').dataset.kind).not.toBe('error')

    const start = part('.reel-handle[data-handle="start"]')
    const before = picker.range.start
    start.focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(picker.range.start).toBe(before - 0.5)
  })

  it('stops the storyboard when the picker closes', async () => {
    const picker = await openEditing()
    picker.close()
    await sleep(500)
    expect(errors(), 'a cancelled storyboard is not an error').toEqual([])
    expect(picker.querySelector('.reel-timeline')).toBeNull()
  })
})

describe('<ml-reel-picker> HLS on the page’s player', () => {
  /**
   * The fMP4 stream, not the ladder: Playwright's WebKit loads the ladder's MPEG-TS segments natively
   * but its clock never advances, paused or not (the old picker's "seek to 1.8" timeouts were this).
   * Safari proper plays MPEG-TS HLS; the ladder's captions are covered below without playing it.
   */
  it(`loops the range on an HLS player (${'natively in WebKit, hls.js elsewhere'}) and leaves it paused on close`, async () => {
    const picker = await openEditing({}, fmp4Url)
    await harness.playing()
    const video = harness.video()
    if (isWebKit()) {
      expect(video.currentSrc).toMatch(/flower\.m3u8$/)
    } else {
      // hls.js plays through MediaSource.
      expect(video.src.startsWith('blob:')).toBe(true)
    }
    await waitFor(() => video.currentTime > picker.range.end - 0.3, 'playback to reach the end of the range')
    await waitFor(() => video.currentTime < picker.range.start + 0.5 && !video.seeking, 'the loop back to the start')
    picker.close()
    await waitFor(() => video.paused, 'the player to be left paused')
    expect(harness.player.clipRange).toBeNull()
  })

  it('asks for the stream’s URL when the player plays through MediaSource, and clips it once given', async (ctx) => {
    if (isWebKit()) return ctx.skip()
    const picker = await harness.mount({}, { src: fmp4Url })
    picker.source = null
    expect(harness.video().currentSrc.startsWith('blob:')).toBe(true)
    picker.show()
    await waitFor(() => errors().length > 0, 'the error')
    expect(errors()[0]).toMatchObject({ reason: 'no-source', fatal: true })
    expect(picker.state).toBe('blocked')
    expect(harness.player.clipRange).toBeNull()

    picker.close()
    picker.source = fmp4Url
    picker.show()
    await waitFor(() => picker.state === 'editing', 'the editor with the stream’s URL')
  })
})

describe('<ml-reel-picker> captions', () => {
  it('burns in what the player shows: English, French or none', async () => {
    const picker = await openEditing()
    await harness.chooseCaptions('Off')
    const plain = await harness.export()
    part<HTMLButtonElement>('.reel-again').click()
    await waitFor(() => picker.state === 'editing', 'the editor again')

    await harness.chooseCaptions('English')
    const english = await harness.export()
    part<HTMLButtonElement>('.reel-again').click()
    await waitFor(() => picker.state === 'editing', 'the editor again')

    await harness.chooseCaptions('Français')
    const french = await harness.export()

    const withEnglish = await captionBand(plain, english)
    const languages = await captionBand(english, french)
    console.log(`REEL_PICKER ${engine()} caption pixels: off vs English ${withEnglish.toFixed(3)}, English vs French ${languages.toFixed(3)}`)
    expect(withEnglish).toBeGreaterThan(0.01)
    expect(languages).toBeGreaterThan(0.002)
    expect(errors()).toEqual([])
  })

  it('offers no captions with nothing to burn in, and locks the controls while exporting', async () => {
    const picker = await harness.open({ endCard: false })
    await harness.playing()
    expect(harness.player.captionTracks).toEqual([])
    part<HTMLButtonElement>('.reel-export-button').click()
    await waitFor(() => picker.state === 'exporting', 'the export')
    expect(part<HTMLInputElement>('input[name="endcard"]').disabled).toBe(true)
    expect(part('.reel-crop').getAttribute('aria-disabled')).toBe('true')
    picker.cancel()
    await waitFor(() => picker.state === 'editing', 'the cancel')
  })
})
