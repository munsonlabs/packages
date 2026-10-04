import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { asTrackList, captionUrl, defaultTrackIndex, isVttFile, parseVtt, passedTrackInfo, toCues } from '@/captions/cues'
import { fetchCaptions, loadCaptions } from '@/captions/fetch'

const vtt = `WEBVTT

00:00:01.000 --> 00:00:02.500
Bonjour

00:00:03.000 --> 00:00:05.250
<i>Deux</i> lignes
`

const srt = '1\n00:00:01,000 --> 00:00:02,500\nBonjour\n'

describe('captionUrl', () => {
  it('takes WebVTT text and an empty string for text, not a URL', () => {
    expect(captionUrl('WEBVTT')).toBeNull()
    expect(captionUrl('  ﻿WEBVTT - Title')).toBeNull()
    expect(captionUrl(vtt)).toBeNull()
    expect(captionUrl('')).toBeNull()
  })

  it('takes anything else for a URL, absolute or relative to the document', () => {
    for (const url of [
      'captions.vtt',
      '/media/clock.fr.vtt',
      '../subs/en.vtt?v=2',
      'https://cdn.example.com/a.vtt',
      'blob:https://x/1',
      'data:text/vtt,WEBVTT',
      'not a caption file',
    ]) {
      expect(captionUrl(url), url).toBe(new URL(url, document.baseURI).href)
    }
    expect(captionUrl('/media/clock.fr.vtt')).toBe(new URL('/media/clock.fr.vtt', document.baseURI).href)
    expect(captionUrl(' captions.vtt ')).toBe(new URL('captions.vtt', document.baseURI).href)
    expect(captionUrl(new URL('https://cdn.example.com/a.vtt'))).toBe('https://cdn.example.com/a.vtt')
    expect(captionUrl('WEBVTT\n')).toBeNull()
    expect(captionUrl([{ start: 0, end: 1, text: 'cue' }])).toBeNull()
  })
})

describe('isVttFile', () => {
  it('takes a WEBVTT header, after a byte-order mark and whitespace, and nothing else', () => {
    expect(isVttFile(vtt)).toBe(true)
    expect(isVttFile('﻿WEBVTT\n')).toBe(true)
    expect(isVttFile('\n  WEBVTT - Title\r\n')).toBe(true)
    expect(isVttFile('WEBVTT')).toBe(true)
    for (const body of [srt, '00:01.000 --> 00:02.000\nNo header', 'WEBVTTX', '<!doctype html>', '{"error":"no"}', '']) {
      expect(isVttFile(body), JSON.stringify(body)).toBe(false)
    }
  })
})

describe('passed tracks', () => {
  const tracks = [
    { src: 'en.vtt', srclang: 'en', label: 'English' },
    { src: 'fr.vtt', srclang: 'fr' },
    { src: 'de.vtt', srclang: 'de-DE', label: 'Deutsch' },
  ]

  it('chooses the default one, else the first matching the language, else the first', () => {
    expect(defaultTrackIndex(tracks, 'fr-FR')).toBe(1)
    expect(defaultTrackIndex(tracks, 'de-DE')).toBe(2)
    expect(defaultTrackIndex(tracks, 'de')).toBe(2)
    expect(defaultTrackIndex(tracks, 'EN')).toBe(0)
    expect(defaultTrackIndex(tracks, 'ja')).toBe(0)
    expect(defaultTrackIndex(tracks, '')).toBe(0)
    expect(defaultTrackIndex([tracks[0], { ...tracks[1], default: true }, tracks[2]], 'de')).toBe(1)
    expect(defaultTrackIndex([], 'en')).toBe(-1)
  })

  it('lists them as passed:<n>, named by label, then language', () => {
    expect(passedTrackInfo(tracks, 'fr')).toEqual([
      { id: 'passed:0', kind: 'passed', language: 'en', label: 'English', default: false },
      { id: 'passed:1', kind: 'passed', language: 'fr', label: 'fr', default: true },
      { id: 'passed:2', kind: 'passed', language: 'de-DE', label: 'Deutsch', default: false },
    ])
    expect(passedTrackInfo([{ src: 'x.vtt' }])[0].label).toBe('Captions 1')
  })

  it('tells a list of tracks from a list of cues', () => {
    expect(asTrackList(tracks)).toBe(tracks)
    expect(asTrackList('WEBVTT')).toEqual([{ src: 'WEBVTT' }])
    const cues = [{ start: 0, end: 1, text: 'cue' }]
    expect(asTrackList(cues)).toEqual([{ src: cues }])
    expect(asTrackList([])).toEqual([])
    expect(asTrackList(null)).toEqual([])
  })
})

describe('fetchCaptions and loadCaptions', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const respond = (body: string, init: ResponseInit = {}) => new Response(body, init)

  it('fetches with the signal and parses WebVTT', async () => {
    const fetch = vi.fn(async () => respond(vtt))
    vi.stubGlobal('fetch', fetch)
    const signal = new AbortController().signal
    expect(await loadCaptions('/clock.fr.vtt', { signal })).toEqual(parseVtt(vtt))
    expect(fetch).toHaveBeenCalledWith(new URL('/clock.fr.vtt', document.baseURI).href, { signal })
  })

  it('rejects with an Error saying why for an HTTP error, a failed fetch or a file that is not WebVTT', async () => {
    vi.stubGlobal('fetch', async () => respond('missing', { status: 404, statusText: 'Not Found' }))
    await expect(fetchCaptions('https://cdn.example.com/a.vtt')).rejects.toThrow('answered 404 Not Found')
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(fetchCaptions('https://cdn.example.com/a.vtt')).rejects.toThrow('Access-Control-Allow-Origin')
    // SubRip is not read, whatever the file is called or served as.
    for (const body of ['<!doctype html><!-- a comment --><p>Not found</p>', '{"error":"no"}', '', srt, '00:01.000 --> 00:02.000\nNo header']) {
      vi.stubGlobal('fetch', async () => respond(body, { headers: { 'Content-Type': 'text/vtt' } }))
      await expect(fetchCaptions('https://cdn.example.com/a.vtt'), JSON.stringify(body)).rejects.toThrow('is not WebVTT')
    }
    // A WebVTT file without cues is a caption file, just an empty one.
    vi.stubGlobal('fetch', async () => respond('WEBVTT\n'))
    expect(await fetchCaptions('https://cdn.example.com/a.vtt')).toEqual([])
  })

  it('rejects with the signal’s reason when aborted', async () => {
    const controller = new AbortController()
    const reason = new DOMException('stop', 'AbortError')
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => {
      controller.abort(reason)
      return Promise.reject(init.signal?.reason)
    })
    await expect(fetchCaptions('https://cdn.example.com/a.vtt', { signal: controller.signal })).rejects.toBe(reason)
  })

  it('reads text, cues and URL objects', async () => {
    const fetch = vi.fn(async () => respond('WEBVTT\n\n00:01.000 --> 00:02.000\nVia URL'))
    vi.stubGlobal('fetch', fetch)
    expect(await loadCaptions(vtt)).toEqual(parseVtt(vtt))
    expect(toCues(vtt)).toEqual([
      { start: 1, end: 2.5, text: 'Bonjour' },
      { start: 3, end: 5.25, text: 'Deux lignes' },
    ])
    expect(
      await loadCaptions([
        { start: 2, end: 3, text: 'b' },
        { start: 0, end: 1, text: 'a' },
      ]),
    ).toEqual([
      { start: 0, end: 1, text: 'a' },
      { start: 2, end: 3, text: 'b' },
    ])
    expect(fetch).not.toHaveBeenCalled()
    expect(await loadCaptions(new URL('https://cdn.example.com/a.vtt'))).toEqual([{ start: 1, end: 2, text: 'Via URL' }])
  })
})
