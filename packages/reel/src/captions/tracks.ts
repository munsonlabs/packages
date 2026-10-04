import type { CaptionCue, CaptionTrackInfo, CaptionTrackSource, ClipSource, PlaylistCache } from '@/types'
import { isCaptionKind, passedTrackInfo, toCues } from '@/captions/cues'
import { isHlsUrl, listHlsRenditions, type HlsRendition } from '@/captions/hls'

export function sourceUrl(source: ClipSource): string | null {
  if (typeof source === 'string') {
    return new URL(source, globalThis.location?.href).href
  }
  if (source instanceof URL) {
    return source.href
  }
  if (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement) {
    const url = source.currentSrc || source.src
    return url ? new URL(url, globalThis.location?.href).href : null
  }
  return null
}

function renditionInfo(rendition: HlsRendition): CaptionTrackInfo {
  return {
    id: `hls:${rendition.index}`,
    kind: 'hls',
    language: rendition.language,
    label: rendition.name || rendition.language || `Subtitles ${rendition.index + 1}`,
    default: rendition.default,
  }
}

/**
 * The caption tracks a source offers, for `captions: { track: id }` and the picker's menu: the `tracks`
 * passed in first (`passed:<n>`, `default` on the one chosen when none is asked for), then an HLS
 * master's `SUBTITLES` renditions (`hls:<n>`, read from the master alone), then a `<video>`'s caption
 * and subtitle text tracks (`text:<n>`) that are not those same renditions. Rejects when an HLS
 * playlist cannot be fetched.
 */
export async function listCaptionTracks(
  source: ClipSource,
  options: { signal?: AbortSignal; tracks?: CaptionTrackSource[]; cache?: PlaylistCache } = {},
): Promise<CaptionTrackInfo[]> {
  const url = sourceUrl(source)
  const tracks: CaptionTrackInfo[] = passedTrackInfo(options.tracks ?? [])
  if (url && isHlsUrl(url)) {
    tracks.push(...(await listHlsRenditions(url, options.signal, options.cache)).map(renditionInfo))
  }
  if (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement) {
    const list = Array.from(source.textTracks)
    list.forEach((track, index) => {
      if (!isCaptionKind(track.kind)) {
        return
      }
      const duplicate = tracks.some((other) => other.kind === 'hls' && other.language === track.language && other.label === track.label)
      if (!duplicate) {
        tracks.push({
          id: `text:${index}`,
          kind: 'text-track',
          language: track.language,
          label: track.label || track.language || `Captions ${index + 1}`,
          default: track.mode === 'showing',
        })
      }
    })
  }
  return tracks
}

export function textTrackFor(source: ClipSource, id: string): TextTrack | null {
  const match = /^text:(\d+)$/.exec(id)
  if (!match || typeof HTMLVideoElement === 'undefined' || !(source instanceof HTMLVideoElement)) {
    return null
  }
  return source.textTracks[Number(match[1])] ?? null
}

const TRACK_LOAD_TIMEOUT = 5000

/**
 * A `disabled` track has no cues loaded, so it is set to `hidden` (which fetches a `<track>` file
 * without showing it), read once the file has loaded or failed, and set back to `disabled`.
 */
export async function readTextTrack(video: HTMLVideoElement, track: TextTrack, signal?: AbortSignal): Promise<CaptionCue[]> {
  const mode = track.mode
  if (mode === 'disabled') {
    track.mode = 'hidden'
  }
  try {
    const element = Array.from(video.querySelectorAll('track')).find((candidate) => candidate.track === track)
    if (element && element.readyState !== HTMLTrackElement.LOADED && element.readyState !== HTMLTrackElement.ERROR) {
      await new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(timer)
          element.removeEventListener('load', done)
          element.removeEventListener('error', done)
          signal?.removeEventListener('abort', done)
          resolve()
        }
        const timer = setTimeout(done, TRACK_LOAD_TIMEOUT)
        element.addEventListener('load', done)
        element.addEventListener('error', done)
        signal?.addEventListener('abort', done)
      })
    }
    signal?.throwIfAborted()
    return toCues(track)
  } finally {
    if (mode === 'disabled') {
      track.mode = 'disabled'
    }
  }
}
