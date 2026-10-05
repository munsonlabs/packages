import { afterEach, describe, it, expect, vi } from 'vite-plus/test'
import { loadCaptions, parseVtt } from '@/splice/captions'

const VTT = `WEBVTT

1
00:00:02.000 --> 00:00:04.000 line:90%
<v Narrator>A gold &amp; <i>bright</i> marker.</v>

NOTE this is skipped

00:00:00.000 --> 00:00:02.000
The clock starts.

00:00:05.000 --> bad
Dropped.
`

describe('parseVtt', () => {
  it('reads timing and plain text, skipping notes, ids, settings and bad cues', () => {
    expect(parseVtt(VTT)).toEqual([
      { start: 2, end: 4, text: 'A gold & bright marker.' },
      { start: 0, end: 2, text: 'The clock starts.' },
    ])
  })
})

describe('loadCaptions', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads nothing without captions', async () => {
    expect(await loadCaptions({ source: '' })).toEqual([])
  })

  it('reads WebVTT text and sorts by start', async () => {
    const cues = await loadCaptions({ source: '', captions: VTT })
    expect(cues.map((cue) => cue.start)).toEqual([0, 2])
  })

  it('fetches a URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(VTT)),
    )
    const cues = await loadCaptions({ source: '', captions: 'https://example.com/clock.vtt' })
    expect(cues).toHaveLength(2)
  })

  it('warns and leaves captions out when they cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>', { status: 404 })),
    )
    const onWarning = vi.fn()
    const cues = await loadCaptions({ source: '', captions: 'https://example.com/missing.vtt', onWarning })
    expect(cues).toEqual([])
    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('404'))
  })

  it('rejects with the abort reason when aborted', async () => {
    const controller = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(controller.signal.reason)),
    )
    controller.abort()
    await expect(loadCaptions({ source: '', captions: 'https://example.com/clock.vtt', signal: controller.signal })).rejects.toThrow()
  })
})
