import type { CaptionCue, CaptionInput, CaptionTrackSource } from '@/types'

/**
 * Parses a WebVTT timestamp (`mm:ss.ttt` or `hh:mm:ss.ttt`) into seconds, or `null` if it is not one.
 */
export function parseTimestamp(value: string): number | null {
  const match = /^(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})$/.exec(value.trim())
  if (!match) {
    return null
  }
  const hours = Number(match[1] ?? 0)
  const minutes = Number(match[2])
  const seconds = Number(match[3])
  const millis = Number(match[4])
  return hours * 3600 + minutes * 60 + seconds + millis / 1000
}

/**
 * Removes WebVTT cue markup (`<v Speaker>`, `<i>`, `<c.class>`, karaoke timestamps) and decodes the
 * handful of entities VTT allows, leaving the plain text that gets drawn.
 */
export function stripCueMarkup(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim()
}

/**
 * Parses the text of a WebVTT file into cues. It reads what burning in needs (timing and text) and
 * skips everything else: the header, `NOTE`, `STYLE` and `REGION` blocks, cue identifiers and cue
 * settings. Blocks with an unreadable timing line are dropped rather than failing the whole file.
 */
export function parseVtt(source: string): CaptionCue[] {
  const cues: CaptionCue[] = []
  const blocks = source.replace(/\r\n?/g, '\n').split(/\n{2,}/)
  for (const block of blocks) {
    const lines = block.split('\n')
    const timingIndex = lines.findIndex((line) => line.includes('-->'))
    if (timingIndex === -1) {
      continue
    }
    const [from, rest] = lines[timingIndex].split('-->')
    const start = parseTimestamp(from)
    const end = parseTimestamp(rest.trim().split(/\s+/)[0])
    if (start === null || end === null || end <= start) {
      continue
    }
    const text = stripCueMarkup(lines.slice(timingIndex + 1).join('\n'))
    if (text) {
      cues.push({ start, end, text })
    }
  }
  return cues
}

/** Anything that can be a `-->` cue timing line. */
const TIMING_LINE = /(^|\n)[^\S\n]*(?:\d+:)?\d{1,2}:\d{1,2}(?:[.,]\d{1,3})?[^\S\n]*-->[^\S\n]*(?:\d+:)?\d{1,2}:\d{1,2}/

/**
 * True when a caption string is caption text rather than the address of a caption file. It is text
 * when, after an optional byte-order mark and leading whitespace, it starts with `WEBVTT`; when any
 * line is a cue timing (`00:01.000 --> 00:02.000`); when it holds whitespace inside it (a line break,
 * or a space a URL would have percent-encoded); or when it is empty. Anything else is a URL, absolute
 * or relative to `document.baseURI`.
 */
export function isCaptionText(value: string): boolean {
  const text = value.replace(/^\uFEFF/, '').trim()
  return text === '' || text.startsWith('WEBVTT') || TIMING_LINE.test(text) || /\s/.test(text)
}

/**
 * True when fetched text is a WebVTT file: after an optional byte-order mark and leading whitespace
 * it starts with the `WEBVTT` header. An HTML page, JSON, an empty body or a SubRip file is not.
 */
export function isVttFile(text: string): boolean {
  return /^WEBVTT(?:[ \t\r\n]|$)/.test(text.replace(/^\uFEFF/, '').trimStart())
}

/**
 * Normalises caption input that needs no fetching into cues sorted by start time: cues, the text of a
 * WebVTT file, or a `TextTrack`. A `TextTrack` is read from its loaded `cues`; a track whose
 * mode is `'disabled'` has none, so the caller should set it to `'hidden'` and wait for its cues before
 * clipping. A string that is a URL (see {@link isCaptionText}) has no cues here; `createClip` and the
 * picker fetch it.
 */
export function toCues(input: CaptionCue[] | string | TextTrack): CaptionCue[] {
  let cues: CaptionCue[]
  if (typeof input === 'string') {
    cues = parseVtt(input)
  } else if (Array.isArray(input)) {
    cues = input.map((cue) => ({ start: cue.start, end: cue.end, text: cue.text }))
  } else {
    cues = []
    for (const cue of Array.from(input.cues ?? [])) {
      const text = 'text' in cue ? stripCueMarkup(String((cue as VTTCue).text)) : ''
      if (text) {
        cues.push({ start: cue.startTime, end: cue.endTime, text })
      }
    }
  }
  return cues.sort((a, b) => a.start - b.start)
}

/**
 * The cues showing at `time` (source seconds), in start order. Captions are few, so a linear scan per
 * frame costs nothing next to encoding the frame.
 */
export function activeCues(cues: CaptionCue[], time: number): CaptionCue[] {
  return cues.filter((cue) => cue.start <= time && time < cue.end)
}

/** The base relative caption URLs resolve against: the document's base URL, else the page's. */
function baseUrl(): string | undefined {
  return globalThis.document?.baseURI ?? globalThis.location?.href
}

/**
 * The absolute URL a caption input names (a `URL`, or a string {@link isCaptionText} says is not
 * text), or `null` for text, cues and tracks.
 */
export function captionUrl(input: unknown): string | null {
  if (input instanceof URL) {
    return input.href
  }
  if (typeof input === 'string' && !isCaptionText(input)) {
    try {
      return new URL(input.trim(), baseUrl()).href
    } catch {
      return null
    }
  }
  return null
}

/** True for a list of caption track descriptors (`{ src, … }`) rather than a list of cues. */
export function isTrackList(input: unknown): input is CaptionTrackSource[] {
  return Array.isArray(input) && input.length > 0 && input.every((item) => item !== null && typeof item === 'object' && 'src' in item)
}

/** Caption input as track descriptors: a list stays a list, a single input is one unnamed track. */
export function asTrackList(input: CaptionInput | CaptionTrackSource[] | null | undefined): Array<CaptionTrackSource | { src: CaptionInput }> {
  if (input === null || input === undefined || (Array.isArray(input) && input.length === 0)) {
    return []
  }
  return isTrackList(input) ? input : [{ src: input as CaptionInput }]
}

/**
 * Which of several passed caption tracks is chosen when none is asked for: the one marked `default`,
 * else the first whose `srclang` matches `language` (exactly, then by its primary subtag, so `fr`
 * matches `fr-CA` and the other way round), else the first. `-1` for no tracks.
 */
export function defaultTrackIndex(
  tracks: ReadonlyArray<{ srclang?: string; default?: boolean }>,
  language = globalThis.navigator?.language ?? '',
): number {
  if (tracks.length === 0) {
    return -1
  }
  const marked = tracks.findIndex((track) => track.default === true)
  if (marked !== -1) {
    return marked
  }
  const wanted = language.toLowerCase()
  if (wanted) {
    const exact = tracks.findIndex((track) => track.srclang?.toLowerCase() === wanted)
    if (exact !== -1) {
      return exact
    }
    const primary = wanted.split('-')[0]
    const close = tracks.findIndex((track) => track.srclang?.toLowerCase().split('-')[0] === primary)
    if (close !== -1) {
      return close
    }
  }
  return 0
}
