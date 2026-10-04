import type { CaptionCue, CaptionInput, CaptionTrackInfo, CaptionTrackSource } from '@/types'

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

export function vttTimestamp(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000))
  const pad = (value: number, width = 2) => String(value).padStart(width, '0')
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}.${pad(ms % 1000, 3)}`
}

export function isCaptionKind(kind: string): boolean {
  return kind === 'captions' || kind === 'subtitles'
}

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
 * Parses WebVTT into cues: timing and text only, skipping the header, `NOTE`/`STYLE`/`REGION` blocks,
 * identifiers and settings. A block with an unreadable timing line is dropped, not fatal.
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

export function isVttFile(text: string): boolean {
  return /^WEBVTT(?:[ \t\r\n]|$)/.test(text.replace(/^\uFEFF/, '').trimStart())
}

/**
 * Cues sorted by start from cues, WebVTT text or a `TextTrack`. A `TextTrack` is read from its loaded
 * `cues`, and a `'disabled'` track has none: set it `'hidden'` and wait for its cues first. A URL string
 * has no cues here; `createClip` and the picker fetch it.
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

export function activeCues(cues: CaptionCue[], time: number): CaptionCue[] {
  return cues.filter((cue) => cue.start <= time && time < cue.end)
}

function baseUrl(): string | undefined {
  return globalThis.document?.baseURI ?? globalThis.location?.href
}

export function captionUrl(input: unknown): string | null {
  if (input instanceof URL) {
    return input.href
  }
  if (typeof input === 'string' && input.trim() !== '' && !isVttFile(input)) {
    try {
      return new URL(input.trim(), baseUrl()).href
    } catch {
      return null
    }
  }
  return null
}

export function isTrackList(input: unknown): input is CaptionTrackSource[] {
  return Array.isArray(input) && input.length > 0 && input.every((item) => item !== null && typeof item === 'object' && 'src' in item)
}

export function asTrackList(input: CaptionInput | CaptionTrackSource[] | null | undefined): Array<CaptionTrackSource | { src: CaptionInput }> {
  if (input === null || input === undefined || (Array.isArray(input) && input.length === 0)) {
    return []
  }
  return isTrackList(input) ? input : [{ src: input as CaptionInput }]
}

/**
 * The passed track chosen when none is asked for: the one marked `default`, else the first whose
 * `srclang` matches `language` (exactly, then by primary subtag, so `fr` matches `fr-CA`), else the
 * first. `-1` for no tracks.
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

export function passedTrackInfo(tracks: ReadonlyArray<CaptionTrackSource>, language?: string): CaptionTrackInfo[] {
  const chosen = defaultTrackIndex(tracks, language)
  return tracks.map((track, index) => ({
    id: `passed:${index}`,
    kind: 'passed',
    language: track.srclang ?? '',
    label: track.label || track.srclang || `Captions ${index + 1}`,
    default: index === chosen,
  }))
}
