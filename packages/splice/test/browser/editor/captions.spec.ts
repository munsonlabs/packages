import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { changedFraction, pixelsAt } from '@test/browser/helpers'
import { EditorHarness, waitFor } from '@test/browser/editor-harness'
import type { EditorErrorDetail } from '@/types/editor'

vi.mock('@/editor/labels', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/editor/labels')>()),
  CLIP_LENGTH: 2,
  LONGEST_CLIP: 3,
}))

const harness = new EditorHarness()
const part = <T extends Element = HTMLElement>(selector: string) => harness.part<T>(selector)
const errors = () => harness.of('error').map((event) => event.detail as EditorErrorDetail)

const english = 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nEnglish words on screen\n'
const french = 'WEBVTT\r\n\r\n00:00:00.000 --> 00:00:05.000\r\n<i>Des mots français</i>\r\n'

const createTwoTracks = () => [
  { src: harness.createVtt(english), srclang: 'en', label: 'English', default: true },
  { src: harness.createVtt(french), srclang: 'fr', label: 'Français' },
]

/** How much of the caption band, near the bottom, differs between two clips half a second in. */
async function readCaptionBand(a: Blob, b: Blob): Promise<number> {
  const [first, second] = await Promise.all([pixelsAt(a, 0.5), pixelsAt(b, 0.5)])
  return changedFraction(first, second, Math.round(first.height * 0.6), Math.round(first.height * 0.9))
}

/** How much of the crop window's preview is painted: the captions, with nothing else on. */
function readPreviewInk(): number {
  const canvas = part<HTMLCanvasElement>('.splice-crop canvas.splice-preview')
  const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
  let ink = 0
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) ink++
  return ink / (data.length / 4)
}

afterEach(() => {
  harness.cleanup()
})

describe('<SpliceEditor> and the captions the player shows', () => {
  it('previews and burns in the track the player shows: English, French or none', async () => {
    await harness.open({ endCard: false }, { time: 1, tracks: createTwoTracks() })
    // Playwright's browsers run in en-US: English is the default.
    await waitFor(() => harness.getCaptions() === 'English', 'English by default')
    await waitFor(() => readPreviewInk() > 0.001, 'the English cues over the picture')
    const englishClip = await harness.export()
    await harness.editAgain()

    await harness.chooseCaptions('Français')
    await waitFor(() => readPreviewInk() > 0.001, 'the French cues over the picture')
    const frenchClip = await harness.export()
    await harness.editAgain()

    await harness.chooseCaptions('Off')
    await waitFor(() => readPreviewInk() === 0, 'no cues over the picture')
    const plain = await harness.export()

    expect(await readCaptionBand(plain, englishClip)).toBeGreaterThan(0.01)
    expect(await readCaptionBand(plain, frenchClip)).toBeGreaterThan(0.01)
    expect(await readCaptionBand(englishClip, frenchClip)).toBeGreaterThan(0.005)
    expect(errors()).toEqual([])
  })

  it('makes a clip without captions when the player has none', async () => {
    await harness.open({ endCard: false }, { time: 1 })
    expect(harness.player.captionTracks).toEqual([])
    await harness.export()
    expect(harness.state).toBe('done')
    expect(errors()).toEqual([])
  })

  it('cycles the player’s track from the transport, its label following', async () => {
    const captionsButton = () => part<HTMLButtonElement>('.splice-transport .ml-video-captions-button')
    await harness.open({ endCard: false, labels: { captions: 'Textning', captionsOff: 'Av' } }, { time: 1, tracks: createTwoTracks() })
    await waitFor(() => harness.getCaptions() === 'English', 'English by default')
    expect(captionsButton().getAttribute('aria-label')).toBe('Textning: English')

    captionsButton().click()
    await waitFor(() => harness.getCaptions() === 'Français', 'French on the player')
    await waitFor(() => captionsButton().getAttribute('aria-label') === 'Textning: Français', 'the French label')

    captionsButton().click()
    await waitFor(() => harness.player.activeCaptionIndex === null, 'captions off')
    await waitFor(() => captionsButton().getAttribute('aria-label') === 'Textning: Av', 'the Off label')
  })

  it('hides the browser’s rendering of the track while editing, which stays showing, and restores it on close', async () => {
    const shell = () => harness.player.querySelector('.player__shell') as HTMLElement
    const editor = await harness.open({ endCard: false }, { time: 1, tracks: createTwoTracks() })
    await waitFor(() => harness.getCaptions() === 'English', 'English by default')
    await waitFor(() => shell().classList.contains('splice-previewing'), 'the shell marked')
    expect(Array.from(harness.video().textTracks).some((track) => track.mode === 'showing')).toBe(true)

    editor.close()
    await waitFor(() => !shell().classList.contains('splice-previewing'), 'the shell unmarked')
    expect(Array.from(harness.video().textTracks).some((track) => track.mode === 'showing')).toBe(true)
  })
})

describe('<SpliceEditor> caption position', () => {
  const radios = () => Array.from(document.querySelectorAll<HTMLInputElement>('.splice-position input[name="caption-position"]'))
  const readChosen = () => radios().find((radio) => radio.checked)?.value
  const choose = (value: string) =>
    radios()
      .find((radio) => radio.value === value)!
      .click()

  /** The painted share of the preview's top and bottom halves. */
  function readPreviewHalves(): { top: number; bottom: number } {
    const canvas = part<HTMLCanvasElement>('.splice-crop canvas.splice-preview')
    const { width, height } = canvas
    const data = canvas.getContext('2d')!.getImageData(0, 0, width, height).data
    const half = Math.floor(height / 2)
    let top = 0
    let bottom = 0
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) continue
      if (Math.floor((i - 3) / 4 / width) < half) top++
      else bottom++
    }
    return { top, bottom }
  }

  it('offers top, middle and bottom with captions on, bottom by default, and goes with Off', async () => {
    await harness.open({ endCard: false }, { time: 1, tracks: createTwoTracks() })
    await waitFor(() => readPreviewInk() > 0.001, 'the cues over the picture')
    expect(radios().map((radio) => radio.value)).toEqual(['top', 'middle', 'bottom'])
    expect(part('.splice-position legend').textContent).toBe('Caption position')
    expect(readChosen()).toBe('bottom')

    await harness.chooseCaptions('Off')
    await waitFor(() => part('.splice-position') === null, 'the choice to go')
  })

  it('moves the preview with the choice', async () => {
    await harness.open({ endCard: false }, { time: 1, tracks: createTwoTracks() })
    await waitFor(() => readPreviewHalves().bottom > 0, 'the cues at the bottom')
    expect(readPreviewHalves().top).toBe(0)

    choose('top')
    await waitFor(() => readPreviewHalves().top > 0 && readPreviewHalves().bottom === 0, 'the cues at the top')
  })

  it('burns the chosen position into the clip, and keeps it through Edit again', async () => {
    await harness.open({ endCard: false }, { time: 1, tracks: createTwoTracks() })
    await waitFor(() => readPreviewInk() > 0.001, 'the cues over the picture')
    choose('top')
    await waitFor(() => readChosen() === 'top', 'Top chosen')
    const topClip = await harness.export()
    await harness.editAgain()
    expect(readChosen()).toBe('top')

    choose('bottom')
    await waitFor(() => readChosen() === 'bottom', 'Bottom chosen')
    const bottomClip = await harness.export()

    const [top, bottom] = await Promise.all([pixelsAt(topClip, 0.5), pixelsAt(bottomClip, 0.5)])
    expect(changedFraction(top, bottom, Math.round(top.height * 0.1), Math.round(top.height * 0.4))).toBeGreaterThan(0.01)
    expect(changedFraction(top, bottom, Math.round(top.height * 0.6), Math.round(top.height * 0.9))).toBeGreaterThan(0.01)
    expect(errors()).toEqual([])
  })

  it('starts where the captionPosition prop says', async () => {
    await harness.open({ endCard: false, captionPosition: 'middle' }, { time: 1, tracks: createTwoTracks() })
    await waitFor(() => readPreviewInk() > 0.001, 'the cues over the picture')
    expect(readChosen()).toBe('middle')
  })
})
