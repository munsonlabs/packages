import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { attachSidecarTracks } from '@/adapters/native/sidecarTracks'
import { createDeferred, flush } from '@test/helpers'

const EN = { src: 'https://cdn.example.com/en.vtt', kind: 'captions' as const, srclang: 'en', label: 'English' }
const FR = { src: 'https://cdn.example.com/fr.vtt', kind: 'subtitles' as const, srclang: 'fr', label: 'Français' }

let blobCount = 0

function okResponse() {
  return { ok: true, arrayBuffer: () => Promise.resolve(new TextEncoder().encode('WEBVTT').buffer) }
}

function trackEls(videoEl: HTMLVideoElement): HTMLTrackElement[] {
  return [...videoEl.querySelectorAll('track')]
}

/**
 * happy-dom never fires `addtrack`, and hands back a fresh TextTrackList snapshot on every `textTracks`
 * read, so a listener added to one never hears an event dispatched on another. This video's
 * `textTracks` keeps one event target for listeners and still reads tracks from happy-dom's own list.
 */
function makeVideo(): HTMLVideoElement {
  const videoEl = document.createElement('video')
  let proto: object | null = videoEl
  let descriptor: PropertyDescriptor | undefined
  while (proto && !descriptor) {
    descriptor = Object.getOwnPropertyDescriptor(proto, 'textTracks')
    proto = Object.getPrototypeOf(proto)
  }
  const readTracks = () => descriptor!.get!.call(videoEl) as TextTrackList
  const events = new EventTarget()
  const list = new Proxy(events, {
    get(target, key) {
      if (key in target) return (target as unknown as Record<PropertyKey, (...args: unknown[]) => unknown>)[key as string].bind(target)
      return (readTracks() as unknown as Record<PropertyKey, unknown>)[key]
    },
  })
  Object.defineProperty(videoEl, 'textTracks', { get: () => list })
  return videoEl
}

function addStreamTrack(videoEl: HTMLVideoElement, language: string): void {
  const track = videoEl.addTextTrack('subtitles', language.toUpperCase(), language)
  videoEl.textTracks.dispatchEvent(Object.assign(new Event('addtrack'), { track }))
}

beforeEach(() => {
  blobCount = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(okResponse())),
  )
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:track-${++blobCount}`)
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('sidecar caption tracks', () => {
  it('fetches each file and adds it as a <track> pointing at a blob URL', async () => {
    const videoEl = makeVideo()

    attachSidecarTracks(videoEl, [EN, { ...FR, default: true }])
    await flush(4)

    expect(fetch).toHaveBeenCalledWith(EN.src, expect.objectContaining({ signal: expect.any(AbortSignal) }))
    const els = trackEls(videoEl)
    expect(els.map((el) => [el.kind, el.srclang, el.label, el.default])).toEqual([
      ['captions', 'en', 'English', false],
      ['subtitles', 'fr', 'Français', true],
    ])
    expect(els.every((el) => el.src.startsWith('blob:'))).toBe(true)
  })

  it('leaves out a file that fails to fetch', async () => {
    vi.mocked(fetch)
      .mockImplementationOnce(() => Promise.resolve({ ok: false } as Response))
      .mockImplementationOnce(() => Promise.reject(new Error('CORS')))
      .mockImplementationOnce(() => Promise.resolve(okResponse() as unknown as Response))
    const videoEl = makeVideo()

    attachSidecarTracks(videoEl, [EN, FR, { ...EN, srclang: 'de', label: 'Deutsch' }])
    await flush(4)

    expect(trackEls(videoEl).map((el) => el.srclang)).toEqual(['de'])
  })

  it('drops its copy when the stream brings its own track in the same language', async () => {
    const videoEl = makeVideo()
    attachSidecarTracks(videoEl, [EN, FR])
    await flush(4)

    addStreamTrack(videoEl, 'en')

    expect(trackEls(videoEl).map((el) => el.srclang)).toEqual(['fr'])
  })

  it('never adds a file whose language the stream already covers', async () => {
    const videoEl = makeVideo()
    const pending = createDeferred<ReturnType<typeof okResponse>>()
    vi.mocked(fetch).mockImplementationOnce(() => pending.promise as unknown as Promise<Response>)

    attachSidecarTracks(videoEl, [EN])
    addStreamTrack(videoEl, 'en')
    pending.resolve(okResponse())
    await flush(4)

    expect(trackEls(videoEl)).toEqual([])
  })

  it('keeps a language-less file, since there is nothing to match it against', async () => {
    const videoEl = makeVideo()
    attachSidecarTracks(videoEl, [{ src: 'https://cdn.example.com/cc.vtt', kind: 'captions', label: 'Test Track' }])
    await flush(4)

    addStreamTrack(videoEl, 'en')

    expect(trackEls(videoEl).map((el) => el.label)).toEqual(['Test Track'])
  })

  it('removes its tracks and revokes their blob URLs on dispose', async () => {
    const videoEl = makeVideo()
    const sidecar = attachSidecarTracks(videoEl, [EN, FR])
    await flush(4)

    sidecar.dispose()

    expect(trackEls(videoEl)).toEqual([])
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:track-1')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:track-2')
  })

  it('adds nothing for a fetch that lands after dispose', async () => {
    const videoEl = makeVideo()
    const pending = createDeferred<ReturnType<typeof okResponse>>()
    vi.mocked(fetch).mockImplementationOnce(() => pending.promise as unknown as Promise<Response>)

    const sidecar = attachSidecarTracks(videoEl, [EN])
    sidecar.dispose()
    pending.resolve(okResponse())
    await flush(4)

    expect(trackEls(videoEl)).toEqual([])
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('types the blob as WebVTT whatever content type the platform served it with', async () => {
    const videoEl = makeVideo()

    attachSidecarTracks(videoEl, [EN])
    await flush(4)

    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob
    expect(blob.type).toBe('text/vtt')
  })
})
