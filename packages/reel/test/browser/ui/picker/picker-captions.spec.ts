import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import masterUrl from '@test/browser/media/ladder/master.m3u8?url'
import { setPickerDefaults, type ReelErrorDetail, type ReelPickerElement } from '@/elements'
import { changedFraction, pixelsAt } from '@test/browser/helpers'
import { PickerHarness, waitFor } from '@test/browser/picker-harness'

const harness = new PickerHarness()
const part = <T extends Element = HTMLElement>(selector: string) => harness.part<T>(selector)
const errors = () => harness.of('reel-error').map((event) => event.detail as ReelErrorDetail)
const again = async (picker: ReelPickerElement) => {
  part<HTMLButtonElement>('.reel-again').click()
  await waitFor(() => picker.state === 'editing', 'the editor again')
}

const english = 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nEnglish words on screen\n'
const french = 'WEBVTT\r\n\r\n00:00:00.000 --> 00:00:05.000\r\n<i>Des mots français</i>\r\n'

async function captionBand(a: Blob, b: Blob): Promise<number> {
  const [first, second] = await Promise.all([pixelsAt(a, 0.5), pixelsAt(b, 0.5)])
  return changedFraction(first, second, Math.round(first.height * 0.6), Math.round(first.height * 0.9))
}

/** How much of the crop window's caption overlay is painted. */
function overlayInk(): number {
  const canvas = part<HTMLCanvasElement>('.reel-crop canvas.reel-captions')
  const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
  let ink = 0
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) ink++
  return ink / (data.length / 4)
}

/** The painted share of the caption overlay's top half and bottom half. */
function overlayHalves(): { top: number; bottom: number } {
  const canvas = part<HTMLCanvasElement>('.reel-crop canvas.reel-captions')
  const { width, height } = canvas
  const data = canvas.getContext('2d')!.getImageData(0, 0, width, height).data
  const half = Math.floor(height / 2)
  let top = 0
  let bottom = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue
      if (y < half) top++
      else bottom++
    }
  }
  return { top, bottom }
}

const twoTracks = () => [
  { src: harness.vtt(english), srclang: 'en', label: 'English', default: true },
  { src: harness.vtt(french), srclang: 'fr', label: 'Français' },
]

let restore: Array<() => void> = []

beforeEach(() => {
  setPickerDefaults({ length: 2, longest: 3 })
})

afterEach(() => {
  restore.forEach((undo) => undo())
  restore = []
  harness.cleanup()
})

describe('<ml-reel-picker> and the captions the player shows', () => {
  it('burns in the track the player shows, switched through the handle: English, French or none', async () => {
    const picker = await harness.open(
      { endCard: false },
      {
        time: 1,
        tracks: [
          { src: harness.vtt(english), srclang: 'en', label: 'English', default: true },
          { src: harness.vtt(french), srclang: 'fr', label: 'Français' },
        ],
      },
    )
    // Playwright's browsers run in en-US: English is the default.
    await waitFor(() => harness.captions() === 'English', 'English by default')
    await waitFor(() => overlayInk() > 0.001, 'the English cues over the picture')
    const englishClip = await harness.export()
    await again(picker)

    harness.player.setCaptionTrack(1)
    await waitFor(() => harness.captions() === 'Français', 'French on the player')
    await waitFor(() => overlayInk() > 0.001, 'the French cues over the picture')
    const frenchClip = await harness.export()
    await again(picker)

    await harness.chooseCaptions('Off')
    const plain = await harness.export()
    expect(await captionBand(plain, englishClip)).toBeGreaterThan(0.01)
    expect(await captionBand(plain, frenchClip)).toBeGreaterThan(0.01)
    expect(await captionBand(englishClip, frenchClip)).toBeGreaterThan(0.005)
    expect(errors()).toEqual([])
  })

  it('makes a clip without captions when the player has none on', async () => {
    const picker = await harness.open({ endCard: false }, { time: 1 })
    expect(harness.player.captionTracks).toEqual([])
    expect(harness.captions()).toBe('Off')
    await harness.export()
    expect(picker.state).toBe('done')
    expect(errors()).toEqual([])
    expect(part('.reel-note[data-note="captions"]')).toBeNull()
  })
})

describe('<ml-reel-picker> when the captions fail to load', () => {
  /** The ladder's English rendition playlist is refused to reel; the player loads it with XHR, so keeps showing it. */
  function refuseEnglish(): void {
    const original = globalThis.fetch
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (url.includes('subs/en.m3u8')) return Promise.resolve(new Response('', { status: 404, statusText: 'Not Found' }))
      return original(input, init)
    }
    restore.push(() => (globalThis.fetch = original))
  }

  it('keeps working: a note and a non-fatal reel-error', async () => {
    refuseEnglish()
    await harness.open({ endCard: false }, { src: masterUrl, time: 1 })
    await harness.chooseCaptions('English')
    await waitFor(() => Boolean(part('.reel-note[data-note="captions"]')), 'the captions note')
    expect(errors()).toEqual([expect.objectContaining({ reason: 'captions-unavailable', fatal: false })])
    expect(part('.reel-note[data-note="captions"]').textContent).toBe('These captions could not be loaded')
    // Still the track on show: the export asks again, notes it again and is made without captions.
    await harness.export()
    expect(harness.picker.state).toBe('done')
  })

  it('completes an export whose caption track fails, noting it on the finished clip', async () => {
    refuseEnglish()
    const picker = await harness.open({ endCard: false }, { src: masterUrl, time: 1 })
    await harness.chooseCaptions('English')
    await waitFor(() => Boolean(part('.reel-note[data-note="captions"]')), 'the captions note')
    const blob = await harness.export()
    expect(picker.state).toBe('done')
    expect(blob.size).toBeGreaterThan(0)
    expect(harness.of('reel-export')).toHaveLength(1)
    expect(part('.reel-warning').textContent).toBe('The captions could not be loaded, so the clip was made without them.')
    expect(errors().length).toBeGreaterThan(0)
    for (const error of errors()) expect(error).toMatchObject({ reason: 'captions-unavailable', fatal: false })
    // Editing again shows the note again.
    await again(picker)
    expect(part('.reel-note[data-note="captions"]').textContent).toBe('These captions could not be loaded')
  })
})

describe('<ml-reel-picker> captions in the transport', () => {
  const captionsButton = () => part<HTMLButtonElement>('.reel-transport .ml-video-captions-button')
  const modes = () => Array.from(harness.player.mediaElement!.textTracks, (track) => track.mode)

  it('cycles the player’s track, its label following, and the position choice goes with Off', async () => {
    await harness.open({ endCard: false }, { time: 1, tracks: twoTracks() })
    await waitFor(() => harness.captions() === 'English', 'English by default')
    expect(captionsButton().getAttribute('aria-label')).toBe('Captions: English')
    expect(part('.reel-position')).not.toBeNull()

    captionsButton().click()
    await waitFor(() => harness.captions() === 'Français', 'French on the player')
    await waitFor(() => captionsButton().getAttribute('aria-label') === 'Captions: Français', 'the French label')
    expect(modes().filter((mode) => mode === 'showing')).toHaveLength(1)

    captionsButton().click()
    await waitFor(() => harness.player.activeCaptionIndex === null, 'captions off')
    await waitFor(() => captionsButton().getAttribute('aria-label') === 'Captions: Off', 'the Off label')
    await waitFor(() => part('.reel-position') === null, 'the position choice gone')
    expect(modes()).not.toContain('showing')

    captionsButton().click()
    await waitFor(() => harness.captions() === 'English', 'English again')
    await waitFor(() => part('.reel-position') !== null, 'the position choice back')
  })

  it('takes its label from the shared defaults', async () => {
    setPickerDefaults({ labels: { captions: 'Textning', captionsOff: 'Av' } })
    await harness.open({ endCard: false }, { time: 1, tracks: twoTracks() })
    await waitFor(() => captionsButton().getAttribute('aria-label') === 'Textning: English', 'the custom label')
    await harness.chooseCaptions('Off')
    await waitFor(() => captionsButton().getAttribute('aria-label') === 'Textning: Av', 'the custom Off label')
  })
})

describe('<ml-reel-picker> and the player’s own captions while editing', () => {
  const shell = () => harness.player.querySelector('.player__shell') as HTMLElement

  it('hides the browser’s rendering of the track while editing, which stays showing, and restores it on close', async () => {
    const picker = await harness.open({ endCard: false }, { time: 1, tracks: twoTracks() })
    await waitFor(() => harness.captions() === 'English', 'English by default')
    expect(shell()).not.toBeNull()
    await waitFor(() => shell().classList.contains('reel-previewing'), 'the shell marked')
    expect(Array.from(harness.video().textTracks).some((track) => track.mode === 'showing')).toBe(true)
    picker.close()
    await waitFor(() => !shell().classList.contains('reel-previewing'), 'the shell unmarked')
    expect(Array.from(harness.video().textTracks).some((track) => track.mode === 'showing')).toBe(true)
  })
})

describe('<ml-reel-picker> caption position', () => {
  const radios = () => Array.from(harness.picker.querySelectorAll<HTMLInputElement>('.reel-position input[name="caption-position"]'))
  const choose = (value: string) =>
    radios()
      .find((radio) => radio.value === value)!
      .click()

  it('offers top, middle and bottom, bottom by default, and the choice moves the overlay', async () => {
    const picker = await harness.open({ endCard: false }, { time: 1, tracks: twoTracks() })
    await waitFor(() => overlayInk() > 0.001, 'the cues over the picture')
    expect(radios().map((radio) => radio.value)).toEqual(['top', 'middle', 'bottom'])
    expect(radios().find((radio) => radio.checked)?.value).toBe('bottom')
    expect(picker.captionPosition).toBe('bottom')
    const before = overlayHalves()
    expect(before.bottom).toBeGreaterThan(0)
    expect(before.top).toBe(0)

    choose('top')
    await waitFor(() => picker.captionPosition === 'top', 'the position read Top')
    await waitFor(() => overlayHalves().top > 0 && overlayHalves().bottom === 0, 'the overlay at the top')
  })

  it('burns the chosen position into the clip', async () => {
    const picker = await harness.open({ endCard: false }, { time: 1, tracks: twoTracks() })
    await waitFor(() => overlayInk() > 0.001, 'the cues over the picture')
    choose('top')
    await waitFor(() => picker.captionPosition === 'top', 'Top chosen')
    const topClip = await harness.export()
    await again(picker)
    // The choice survives Edit again; it resets only when the picker opens.
    expect(radios().find((radio) => radio.checked)?.value).toBe('top')
    choose('bottom')
    await waitFor(() => picker.captionPosition === 'bottom', 'Bottom chosen')
    const bottomClip = await harness.export()
    const [top, bottom] = await Promise.all([pixelsAt(topClip, 0.5), pixelsAt(bottomClip, 0.5)])
    expect(changedFraction(top, bottom, Math.round(top.height * 0.1), Math.round(top.height * 0.4))).toBeGreaterThan(0.01)
    expect(changedFraction(top, bottom, Math.round(top.height * 0.6), Math.round(top.height * 0.9))).toBeGreaterThan(0.01)
    expect(errors()).toEqual([])
  })

  it('starts at the default position the page set', async () => {
    setPickerDefaults({ captionStyle: { position: 'top' } })
    const picker = await harness.open({ endCard: false }, { time: 1, tracks: twoTracks() })
    await waitFor(() => overlayInk() > 0.001, 'the cues over the picture')
    expect(picker.captionPosition).toBe('top')
    expect(radios().find((radio) => radio.checked)?.value).toBe('top')
    expect(overlayHalves().bottom).toBe(0)
  })
})
