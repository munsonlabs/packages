import type { CaptionCue, PlaylistCache } from '@/types'
import { parseTimestamp, parseVtt } from '@/captions/cues'

export interface HlsRendition {
  index: number
  groupId: string
  language: string
  name: string
  default: boolean
  uri: string | null
}

export interface HlsSegment {
  uri: string
  start: number
  duration: number
  byteRange?: { offset: number; length: number }
}

export interface HlsVariant {
  uri: string
  bandwidth: number
}

export function isHlsUrl(url: string): boolean {
  try {
    return /\.m3u8$/i.test(new URL(url, globalThis.location?.href).pathname)
  } catch {
    return false
  }
}

export function parseAttributes(list: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  for (const match of list.matchAll(/([A-Z0-9-]+)=("[^"]*"|[^,]*)/gi)) {
    attributes[match[1].toUpperCase()] = match[2].replace(/^"|"$/g, '')
  }
  return attributes
}

function lines(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function resolve(uri: string, base: string): string {
  return new URL(uri, base).href
}

export function isMasterPlaylist(text: string): boolean {
  return /#EXT-X-STREAM-INF:/.test(text)
}

export function parseSubtitleRenditions(master: string, base: string): HlsRendition[] {
  const renditions: HlsRendition[] = []
  for (const line of lines(master)) {
    if (!line.startsWith('#EXT-X-MEDIA:')) {
      continue
    }
    const attributes = parseAttributes(line.slice('#EXT-X-MEDIA:'.length))
    if (attributes.TYPE?.toUpperCase() !== 'SUBTITLES') {
      continue
    }
    renditions.push({
      index: renditions.length,
      groupId: attributes['GROUP-ID'] ?? '',
      language: attributes.LANGUAGE ?? '',
      name: attributes.NAME ?? '',
      default: attributes.DEFAULT?.toUpperCase() === 'YES',
      uri: attributes.URI ? resolve(attributes.URI, base) : null,
    })
  }
  return renditions
}

export function parseVariants(master: string, base: string): HlsVariant[] {
  const all = lines(master)
  const variants: HlsVariant[] = []
  for (let i = 0; i < all.length; i++) {
    if (all[i].startsWith('#EXT-X-STREAM-INF:') && all[i + 1] && !all[i + 1].startsWith('#')) {
      const attributes = parseAttributes(all[i].slice('#EXT-X-STREAM-INF:'.length))
      variants.push({ uri: resolve(all[i + 1], base), bandwidth: Number(attributes.BANDWIDTH) || Infinity })
      i++
    }
  }
  return variants
}

function parseByteRange(value: string, previousEnd: number): { offset: number; length: number } {
  const [length, offset] = value.split('@')
  return { length: Number(length), offset: offset === undefined ? previousEnd : Number(offset) }
}

export function parseMediaPlaylist(
  text: string,
  base: string,
): { segments: HlsSegment[]; map: { uri: string; byteRange?: { offset: number; length: number } } | null } {
  const segments: HlsSegment[] = []
  let map: { uri: string; byteRange?: { offset: number; length: number } } | null = null
  let duration: number | null = null
  let byteRange: { offset: number; length: number } | undefined
  let rangeEnd = 0
  let time = 0
  for (const line of lines(text)) {
    if (line.startsWith('#EXTINF:')) {
      duration = Number.parseFloat(line.slice('#EXTINF:'.length))
    } else if (line.startsWith('#EXT-X-BYTERANGE:')) {
      byteRange = parseByteRange(line.slice('#EXT-X-BYTERANGE:'.length), rangeEnd)
      rangeEnd = byteRange.offset + byteRange.length
    } else if (line.startsWith('#EXT-X-MAP:')) {
      const attributes = parseAttributes(line.slice('#EXT-X-MAP:'.length))
      if (attributes.URI) {
        map = { uri: resolve(attributes.URI, base), byteRange: attributes.BYTERANGE ? parseByteRange(attributes.BYTERANGE, 0) : undefined }
      }
    } else if (!line.startsWith('#') && duration !== null) {
      segments.push({ uri: resolve(line, base), start: time, duration, byteRange })
      time += duration
      duration = null
      byteRange = undefined
    }
  }
  return { segments, map }
}

/**
 * `X-TIMESTAMP-MAP=MPEGTS:<90 kHz ticks>,LOCAL:<cue time>`: cue time `local` is media time
 * `mpegts / 90000`. `null` without one.
 */
export function parseTimestampMap(vtt: string): { mpegts: number; local: number } | null {
  const header = vtt.replace(/\r\n?/g, '\n').split(/\n\n/)[0] ?? ''
  const line = header.split('\n').find((entry) => entry.startsWith('X-TIMESTAMP-MAP='))
  if (!line) {
    return null
  }
  const mpegts = /MPEGTS:(\d+)/.exec(line)
  const local = /LOCAL:([\d:.,]+)/.exec(line)
  return { mpegts: mpegts ? Number(mpegts[1]) : 0, local: (local && parseTimestamp(local[1])) ?? 0 }
}

/**
 * MPEG-TS timestamps are 33-bit and wrap after about 26.5 hours.
 */
const WRAP = 2 ** 33

/**
 * Seconds to add to a segment's cue times to land on the clip timeline, which starts at the media's
 * first timestamp: `MPEGTS/90000 - LOCAL - mediaStart`, the short way round the 33-bit wrap. 0 without a
 * map.
 */
export function cueOffset(map: { mpegts: number; local: number } | null, mediaStart: number): number {
  if (!map) {
    return 0
  }
  let ticks = map.mpegts - Math.round(mediaStart * 90_000)
  if (ticks > WRAP / 2) {
    ticks -= WRAP
  } else if (ticks < -WRAP / 2) {
    ticks += WRAP
  }
  return ticks / 90_000 - map.local
}

export async function fetchRange(
  url: string,
  signal?: AbortSignal,
  byteRange?: { offset: number; length: number },
  cache?: PlaylistCache,
): Promise<Response> {
  const headers: HeadersInit = byteRange ? { Range: `bytes=${byteRange.offset}-${byteRange.offset + byteRange.length - 1}` } : {}
  const response = await (cache?.fetch ?? globalThis.fetch)(url, { signal, headers })
  if (!response.ok) {
    throw new Error(`reel: ${url} answered ${response.status}.`)
  }
  return response
}

export async function fetchText(
  url: string,
  signal?: AbortSignal,
  byteRange?: { offset: number; length: number },
  cache?: PlaylistCache,
): Promise<string> {
  return (await fetchRange(url, signal, byteRange, cache)).text()
}

export async function listHlsRenditions(url: string, signal?: AbortSignal, cache?: PlaylistCache): Promise<HlsRendition[]> {
  const text = await fetchText(url, signal, undefined, cache)
  return isMasterPlaylist(text) ? parseSubtitleRenditions(text, url) : []
}

/**
 * The cues of a rendition overlapping `[start, end)`: only the segments whose window overlaps are
 * fetched, each shifted by its {@link cueOffset} and de-duplicated (packagers repeat a cue that spans a
 * segment boundary). `mediaStart` is asked for only when a segment has an `X-TIMESTAMP-MAP`, since it
 * means reading a media segment.
 */
export async function loadHlsCues(
  rendition: HlsRendition,
  options: { start?: number; end?: number; signal?: AbortSignal; mediaStart: () => Promise<number>; cache?: PlaylistCache },
): Promise<CaptionCue[]> {
  if (!rendition.uri) {
    return []
  }
  const start = options.start ?? 0
  const end = options.end ?? Infinity
  const { segments } = parseMediaPlaylist(await fetchText(rendition.uri, options.signal, undefined, options.cache), rendition.uri)
  const wanted = segments.filter((segment) => segment.start < end && segment.start + segment.duration > start)
  const texts = await Promise.all(wanted.map((segment) => fetchText(segment.uri, options.signal, segment.byteRange)))
  let mediaStart: number | null = null
  const seen = new Set<string>()
  const cues: CaptionCue[] = []
  for (const text of texts) {
    const map = parseTimestampMap(text)
    if (map && mediaStart === null) {
      mediaStart = await options.mediaStart()
    }
    const offset = cueOffset(map, mediaStart ?? 0)
    for (const cue of parseVtt(text)) {
      const shifted = { start: cue.start + offset, end: cue.end + offset, text: cue.text }
      const key = `${shifted.start.toFixed(3)}|${shifted.end.toFixed(3)}|${shifted.text}`
      if (shifted.end > start && shifted.start < end && !seen.has(key)) {
        seen.add(key)
        cues.push(shifted)
      }
    }
  }
  return cues.sort((a, b) => a.start - b.start)
}
