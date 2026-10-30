import type { MetadataTags } from 'mediabunny'
import type { SpliceOrigin } from '@/types/splice'

/**
 * Creates the link back to the clipped moment in the format video-player understands: the origin's
 * URL with #ml-t=<start>,<end> on the end, plus &ml-player=<id> if it names a player.
 */
export function createClipLink(origin: SpliceOrigin, start: number, end: number): string {
  const url = new URL(origin.url, globalThis.location?.href)
  const time = `ml-t=${toSeconds(start)},${toSeconds(end)}`
  const player = origin.player ? `&ml-player=${encodeURIComponent(origin.player)}` : ''

  url.hash = time + player
  return url.href
}

/**
 * Creates the MP4 metadata that points the clip back to where it came from: title, publisher as
 * artist, the link as the comment, a short description and the date. No origin means no tags, and
 * the source's own tags are never copied over.
 */
export function createOriginTags(origin: SpliceOrigin | undefined, start: number, end: number): MetadataTags {
  if (!origin) return {}

  const link = createClipLink(origin, start, end)
  const from = origin.title ?? origin.url
  const description = `Clip of ${from}, ${toSeconds(start)}s to ${toSeconds(end)}s: ${link}`

  return { title: origin.title, artist: origin.publisher, comment: link, description, date: new Date() }
}

function toSeconds(value: number): number {
  return Number(Math.max(0, value).toFixed(3))
}
