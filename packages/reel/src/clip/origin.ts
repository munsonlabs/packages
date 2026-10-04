import type { MetadataTags } from 'mediabunny'
import { version } from '../../package.json'
import type { ClipOrigin } from '@/types'

export const encoderTag = `@munsonlabs/reel ${version} (mediabunny, WebCodecs)`

function seconds(value: number): string {
  return String(Number(Math.max(0, value).toFixed(3)))
}

/**
 * The deep link back to the clipped moment, as `@munsonlabs/video-player`'s deep links read it: the
 * origin URL with `#ml-t=<start>,<end>` in seconds, plus `&ml-player=<id>` when the origin names the
 * player. A hash the URL already has is kept and these appended with `&` (replacing any `ml-t=` or
 * `ml-player=` it carried), so single-page-app routes in the hash survive.
 */
export function clipLink(origin: ClipOrigin | string, start: number, end: number): string {
  const { url: href, player } = typeof origin === 'string' ? { url: origin, player: undefined } : origin
  const url = new URL(href, globalThis.location?.href)
  const parts = url.hash
    .replace(/^#/, '')
    .split('&')
    .filter((part) => part && !part.startsWith('ml-t=') && !part.startsWith('ml-player='))
  parts.push(`ml-t=${seconds(start)},${seconds(end)}`)
  if (player) parts.push(`ml-player=${encodeURIComponent(player)}`)
  url.hash = parts.join('&')
  return url.href
}

/**
 * Builds the MP4 tags reel writes for an origin, in Mediabunny's normalised fields plus raw ilst atoms:
 * `©nam` (title), `©ART` and `©pub` (publisher), `©cmt` (the deep link), `©des` (a one-line
 * description), `©day` (date) and `©too` (encoder).
 */
export function originTags(origin: ClipOrigin, start: number, end: number): MetadataTags {
  const link = clipLink(origin, start, end)
  const from = origin.title ?? origin.url
  const tags: MetadataTags = {
    comment: link,
    description: `Clip of ${from}, ${seconds(start)}s to ${seconds(end)}s: ${link}`,
    date: new Date(),
    raw: { '©too': encoderTag, ...(origin.publisher ? { '©pub': origin.publisher } : {}) },
  }
  if (origin.title) {
    tags.title = origin.title
  }
  if (origin.publisher) {
    tags.artist = origin.publisher
  }
  return tags
}
