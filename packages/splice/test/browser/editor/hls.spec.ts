import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import masterUrl from '@test/browser/media/ladder/master.m3u8?url'
import brokenUrl from '@test/browser/media/ladder/broken.m3u8?url'
import fmp4Url from '@test/browser/media/hls/flower.m3u8?url'
import { changedFraction, engine, pixelsAt } from '@test/browser/helpers'
import { EditorHarness, sleep, waitFor } from '@test/browser/editor-harness'
import type { EditorErrorDetail } from '@/types/editor'

vi.mock('@/editor/labels', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/editor/labels')>()),
  CLIP_LENGTH: 2,
  LONGEST_CLIP: 3,
}))

const isWebKit = () => engine().startsWith('webkit')
const harness = new EditorHarness()
const part = <T extends Element = HTMLElement>(selector: string) => harness.part<T>(selector)
const errors = () => harness.of('error').map((event) => event.detail as EditorErrorDetail)

afterEach(() => {
  harness.cleanup()
  vi.restoreAllMocks()
})

describe('<SpliceEditor> filmstrip', () => {
  it('sizes the strip with placeholders at once and paints each thumbnail as it arrives', async () => {
    const strip = () => document.querySelector<HTMLCanvasElement>('.splice-timeline canvas')
    const draws: number[] = []
    const drawImage = CanvasRenderingContext2D.prototype.drawImage
    vi.spyOn(CanvasRenderingContext2D.prototype, 'drawImage').mockImplementation(function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      if (this.canvas === strip()) draws.push(args[1] as number)
      return (drawImage as (...rest: unknown[]) => void).apply(this, args)
    })

    const editor = await harness.mount({ endCard: false }, { src: masterUrl })
    editor.show()
    // Vue renders the panel a tick after show().
    await sleep(0)
    const canvas = strip()!
    const height = Math.round(64 * Math.min(2, devicePixelRatio || 1))
    // Never the default 300x150, not even before the core has loaded.
    expect(canvas.height).toBe(height)
    expect(canvas.width).toBe(Math.round(height * (16 / 9) * 10))

    await waitFor(
      () => draws.length === 10,
      'ten thumbnails',
      20_000,
      () => `${draws.length} drawn`,
    )
    expect(new Set(draws).size).toBe(10)
  })

  it('keeps working without thumbnails, with a non-fatal error', async () => {
    await harness.open({ endCard: false, source: brokenUrl })
    await waitFor(() => errors().length > 0, 'the thumbnails to fail')
    expect(errors()[0]).toMatchObject({ fatal: false, message: expect.stringContaining('thumbnails') })
    expect(harness.state).toBe('editing')
    expect(part('.splice-editor-status').dataset.kind).not.toBe('error')

    const before = harness.range.start
    part('.splice-handle[data-handle="start"]').focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(harness.range.start).toBe(before - 0.5)
  })

  it('stops the thumbnails when the editor closes, without an error', async () => {
    const editor = await harness.open({ endCard: false }, { src: masterUrl })
    editor.close()
    await sleep(500)
    expect(errors()).toEqual([])
    expect(document.querySelector('.splice-timeline')).toBeNull()
  })
})

describe('<SpliceEditor> HLS on the page’s player', () => {
  /**
   * The fMP4 stream, not the ladder: Playwright's WebKit loads the ladder's MPEG-TS segments natively
   * but its clock never advances. Safari proper plays MPEG-TS HLS.
   */
  it('loops the range on an HLS player (natively in WebKit, hls.js elsewhere) and leaves it paused on close', async () => {
    const editor = await harness.open({ endCard: false }, { src: fmp4Url })
    await harness.waitForPlaying()
    const video = harness.video()
    if (isWebKit()) expect(video.currentSrc).toMatch(/flower\.m3u8$/)
    else expect(video.src.startsWith('blob:')).toBe(true)

    await waitFor(() => video.currentTime > harness.range.end - 0.3, 'playback to reach the end of the range')
    await waitFor(() => video.currentTime < harness.range.start + 0.5 && !video.seeking, 'the loop back to the start')
    editor.close()
    await waitFor(() => video.paused, 'the player to be left paused')
    expect(harness.player.clipRange).toBeNull()
  })

  it('asks for the stream’s URL when the player plays through MediaSource, and clips it once given', async (ctx) => {
    if (isWebKit()) return ctx.skip()
    const editor = await harness.mount({ endCard: false }, { src: fmp4Url })
    harness.props.source = null
    expect(harness.video().currentSrc.startsWith('blob:')).toBe(true)
    editor.show()
    await waitFor(() => errors().length > 0, 'the error')
    expect(errors()[0]).toMatchObject({ fatal: true, message: expect.stringContaining('MediaSource') })
    expect(harness.state).toBe('blocked')
    expect(harness.player.clipRange).toBeNull()

    editor.close()
    harness.props.source = fmp4Url
    editor.show()
    await waitFor(() => harness.state === 'editing', 'the editor with the stream’s URL')
    await harness.export()
    expect(harness.state).toBe('done')
  })
})

describe('<SpliceEditor> and an HLS stream’s subtitles', () => {
  /**
   * The ladder's English and French renditions, which hls.js adds to the `<video>` as text tracks with
   * X-TIMESTAMP-MAP applied, so cue time 0 is media time 0.5. Not WebKit: Playwright's WebKit never
   * advances the ladder's MPEG-TS clock. Safari proper plays it, and adds the renditions as text tracks too.
   */
  it('previews and burns in the rendition the player shows', async (ctx) => {
    if (isWebKit()) return ctx.skip()
    await harness.open({ endCard: false }, { src: masterUrl, time: 1.8 })
    expect(harness.player.captionTracks.map((track) => track.label)).toEqual(['English', 'Français'])

    await harness.chooseCaptions('English')
    const canvas = part<HTMLCanvasElement>('.splice-crop canvas.splice-preview')
    const hasInk = () =>
      canvas
        .getContext('2d')!
        .getImageData(0, 0, canvas.width, canvas.height)
        .data.some((value, i) => i % 4 === 3 && value > 0)
    await waitFor(hasInk, 'the rendition’s cue over the picture')
    const captioned = await harness.export()
    await harness.editAgain()

    await harness.chooseCaptions('Off')
    const plain = await harness.export()
    // Half a second into the clip is 1.6s on the stream, where "EN one" is up.
    const [a, b] = await Promise.all([pixelsAt(captioned, 0.5), pixelsAt(plain, 0.5)])
    expect(changedFraction(a, b, Math.round(a.height * 0.6), Math.round(a.height * 0.95))).toBeGreaterThan(0.01)
    expect(errors()).toEqual([])
  })
})
