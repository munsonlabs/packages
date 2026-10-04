import { ALL_FORMATS, BlobSource, Input } from 'mediabunny'
import type { CaptionCue, CaptionTrackSource, ClipSource, PlaylistCache } from '@/types'
import { loadCaptions } from '@/captions/fetch'
import { fetchRange, fetchText, isMasterPlaylist, listHlsRenditions, loadHlsCues, parseMediaPlaylist, parseVariants } from '@/captions/hls'
import { readTextTrack, sourceUrl, textTrackFor } from '@/captions/tracks'

async function fetchBytes(url: string, signal?: AbortSignal, byteRange?: { offset: number; length: number }): Promise<ArrayBuffer> {
  return (await fetchRange(url, signal, byteRange)).arrayBuffer()
}

const mediaStarts = new Map<string, Promise<number>>()

async function playlistStart(url: string, text: string, signal?: AbortSignal): Promise<number> {
  const { segments, map } = parseMediaPlaylist(text, url)
  const first = segments[0]
  if (!first) {
    throw new Error(`reel: ${url} lists no segments.`)
  }
  const parts = await Promise.all([map ? fetchBytes(map.uri, signal, map.byteRange) : null, fetchBytes(first.uri, signal, first.byteRange)])
  const input = new Input({ source: new BlobSource(new Blob(parts.filter((part) => part !== null))), formats: ALL_FORMATS })
  try {
    return await input.getFirstTimestamp()
  } finally {
    input.dispose()
  }
}

/**
 * The media timestamp an HLS presentation starts at: the first timestamp of the first segment of its
 * lowest-bandwidth variant (all variants share one timeline; the next is tried if one cannot be read),
 * read with Mediabunny. `X-TIMESTAMP-MAP`'s `MPEGTS` is measured against it. One segment (plus its init
 * section) is fetched, once per playlist per page.
 */
export function mediaStartOf(url: string, signal?: AbortSignal, cache?: PlaylistCache): Promise<number> {
  let start = mediaStarts.get(url)
  if (!start) {
    start = (async () => {
      const text = await fetchText(url, signal, undefined, cache)
      if (!isMasterPlaylist(text)) {
        return playlistStart(url, text, signal)
      }
      let failure: unknown = new Error(`reel: ${url} has no variants.`)
      for (const variant of parseVariants(text, url).sort((a, b) => a.bandwidth - b.bandwidth)) {
        try {
          return await playlistStart(variant.uri, await fetchText(variant.uri, signal, undefined, cache), signal)
        } catch (error) {
          signal?.throwIfAborted()
          failure = error
        }
      }
      throw failure
    })()
    mediaStarts.set(url, start)
    // A failure is not remembered, so a later try can succeed.
    start.catch(() => mediaStarts.delete(url))
  }
  return start
}

/**
 * The cues of one track from {@link listCaptionTracks} overlapping `[start, end)`. `passed:<n>` reads
 * the n-th of `tracks` (fetched or parsed), `hls:<n>` fetches only the overlapping WebVTT segments with
 * `X-TIMESTAMP-MAP` honoured, `text:<n>` reads a `<video>` track (a disabled one briefly set `hidden`).
 * Rejects with a `RangeError` for an unknown id and an `Error` for a file, playlist or segment that
 * cannot be fetched or is not captions.
 */
export async function loadCaptionTrack(
  source: ClipSource,
  id: string,
  options: {
    start?: number
    end?: number
    signal?: AbortSignal
    resolved?: Blob | string
    tracks?: CaptionTrackSource[]
    cache?: PlaylistCache
  } = {},
): Promise<CaptionCue[]> {
  const start = options.start ?? 0
  const end = options.end ?? Infinity
  const passed = /^passed:(\d+)$/.exec(id)
  const track = passed ? options.tracks?.[Number(passed[1])] : undefined
  if (track) {
    const cues = await loadCaptions(track.src, { signal: options.signal })
    return cues.filter((cue) => cue.end > start && cue.start < end)
  }
  const text = textTrackFor(source, id)
  if (text) {
    const cues = await readTextTrack(source as HTMLVideoElement, text, options.signal)
    return cues.filter((cue) => cue.end > start && cue.start < end)
  }
  const match = /^hls:(\d+)$/.exec(id)
  const url = typeof options.resolved === 'string' ? options.resolved : sourceUrl(source)
  if (match && url) {
    const rendition = (await listHlsRenditions(url, options.signal, options.cache))[Number(match[1])]
    if (rendition) {
      return loadHlsCues(rendition, {
        start,
        end,
        signal: options.signal,
        cache: options.cache,
        mediaStart: () => mediaStartOf(url, options.signal, options.cache),
      })
    }
  }
  throw new RangeError(`reel: the source has no caption track "${id}".`)
}
