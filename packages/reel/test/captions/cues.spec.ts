import { describe, expect, it } from 'vite-plus/test'
import { activeCues, parseTimestamp, parseVtt, stripCueMarkup, toCues } from '@/captions/cues'

const vtt = `WEBVTT
Kind: captions

NOTE this block is ignored

intro
00:00:00.500 --> 00:00:02.000 align:center line:90%
<v Narrator>A <i>flower</i> opens.</v>

00:02.000 --> 00:04.250
Two lines,
&lt;kept&gt; &amp; decoded

00:05.000 --> 00:04.000
backwards cue, dropped
`

describe('parseTimestamp', () => {
  it('reads both VTT forms', () => {
    expect(parseTimestamp('01:02:03.004')).toBeCloseTo(3723.004)
    expect(parseTimestamp('02:03.500')).toBeCloseTo(123.5)
    expect(parseTimestamp('nope')).toBeNull()
  })
})

describe('parseVtt', () => {
  it('keeps timing and plain text, skipping headers, notes, ids, settings and bad cues', () => {
    expect(parseVtt(vtt)).toEqual([
      { start: 0.5, end: 2, text: 'A flower opens.' },
      { start: 2, end: 4.25, text: 'Two lines,\n<kept> & decoded' },
    ])
  })

  it('accepts CRLF files', () => {
    expect(parseVtt(vtt.replace(/\n/g, '\r\n'))).toHaveLength(2)
  })
})

describe('stripCueMarkup', () => {
  it('drops tags and karaoke timestamps', () => {
    expect(stripCueMarkup('<c.loud>Hi</c> <00:00:01.000>there')).toBe('Hi there')
  })
})

describe('toCues / activeCues', () => {
  it('sorts cues and finds the ones showing at a time, end exclusive', () => {
    const cues = toCues([
      { start: 3, end: 5, text: 'b' },
      { start: 0, end: 3, text: 'a' },
    ])
    expect(cues.map((cue) => cue.text)).toEqual(['a', 'b'])
    expect(activeCues(cues, 3).map((cue) => cue.text)).toEqual(['b'])
    expect(activeCues(cues, 5)).toEqual([])
  })
})
