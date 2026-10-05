import { ERROR_CAPTIONS_NOT_VTT, ERROR_CAPTIONS_STATUS, ERROR_CAPTIONS_UNREACHABLE, WARNING_CAPTIONS_UNAVAILABLE } from '@/constants'
import type { CaptionCue, CaptionInput, SpliceOptions } from '@/types/splice'

/**
 * Loads the captions to burn in, sorted by start time. They can be cues, WebVTT text or a URL to a
 * WebVTT file. If they can't be loaded the clip still gets made, just without them and with a
 * warning.
 */
export async function loadCaptions(options: SpliceOptions): Promise<CaptionCue[]> {
  const { captions, signal } = options
  const warn = options.onWarning ?? console.warn

  const cues = await readCaptions(captions, signal).catch((error) => {
    signal?.throwIfAborted()
    warn(WARNING_CAPTIONS_UNAVAILABLE(error instanceof Error ? error.message : String(error)))
    return []
  })

  return [...cues].sort((a, b) => a.start - b.start)
}

/**
 * Turns whatever caption input we got into cues. A string starting with WEBVTT is the file itself,
 * any other string or URL is somewhere to fetch it from.
 */
async function readCaptions(captions: CaptionInput | undefined, signal?: AbortSignal): Promise<CaptionCue[]> {
  if (!captions) return []
  if (Array.isArray(captions)) return captions

  const isText = typeof captions === 'string' && isVtt(captions)
  const text = isText ? captions : await fetchCaptions(captions, signal)
  return parseVtt(text)
}

/**
 * Fetches a WebVTT file. Throws if the request fails, the server returns an error, or what comes
 * back isn't WebVTT (an HTML error page served as a 200, or an SRT file).
 */
async function fetchCaptions(url: string | URL, signal?: AbortSignal): Promise<string> {
  const href = new URL(url, globalThis.document?.baseURI).href
  const response = await fetch(href, { signal }).catch((error) => {
    signal?.throwIfAborted()
    throw new Error(ERROR_CAPTIONS_UNREACHABLE(href), { cause: error })
  })
  const text = await response.text()

  if (!response.ok) throw new Error(ERROR_CAPTIONS_STATUS(href, response.status))
  if (!isVtt(text)) throw new Error(ERROR_CAPTIONS_NOT_VTT(href))
  return text
}

function isVtt(text: string): boolean {
  return /^WEBVTT(\s|$)/.test(text.trimStart())
}

/**
 * Parses WebVTT into cues. We only care about timings and text, so headers, notes, styles, ids and
 * cue settings are skipped. A cue whose timing line can't be read is dropped.
 */
export function parseVtt(text: string): CaptionCue[] {
  const blocks = text.replace(/\r\n?/g, '\n').split(/\n{2,}/)
  const cues: CaptionCue[] = []

  for (const block of blocks) {
    const lines = block.split('\n')
    const timingIndex = lines.findIndex((line) => line.includes('-->'))
    if (timingIndex === -1) continue

    const [from, to] = lines[timingIndex].split('-->')
    const start = parseTimestamp(from)
    const end = parseTimestamp(to.trim().split(/\s+/)[0])
    const cueText = stripCueMarkup(lines.slice(timingIndex + 1).join('\n'))

    if (start === null || end === null || end <= start || !cueText) continue
    cues.push({ start, end, text: cueText })
  }
  return cues
}

/**
 * Parses a WebVTT timestamp (mm:ss.ttt or hh:mm:ss.ttt) into seconds. Returns null if it isn't one.
 */
function parseTimestamp(value: string): number | null {
  const match = /^(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})$/.exec(value.trim())
  if (!match) return null

  const [, hours = '0', minutes, seconds, millis] = match
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(millis) / 1000
}

/**
 * Strips cue markup like <v Speaker>, <i> and karaoke timestamps, and decodes the few entities
 * WebVTT allows, leaving the plain text we draw.
 */
export function stripCueMarkup(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim()
}
