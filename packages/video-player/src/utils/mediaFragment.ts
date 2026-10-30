/** A time range a page URL asks a player to show, and which player it is for. */
export interface DeepLink {
  start: number
  /** `null` for an open range (`#ml-t=42`), which only seeks. */
  end: number | null
  /** The `ml-player` id the link names, or `null` when any deep-link player may take it. */
  target: string | null
}

/**
 * Reads one Media Fragments time value: seconds (`42.5`), `npt:` seconds, or clock time (`1:02`,
 * `1:02:03.5`). Answers `null` for anything else, including negatives.
 */
export function parseClock(value: string): number | null {
  const text = value.replace(/^npt:/, '').trim()
  if (!/^\d+(?::\d{1,2}){0,2}(?:\.\d+)?$/.test(text)) return null
  return text.split(':').reduce((total, part) => total * 60 + Number(part), 0)
}

/** `42,52` / `42` / `,52` → `{ start, end }`, or `null` when the range is malformed or empty. */
function parseRange(value: string): { start: number; end: number | null } | null {
  const [from = '', to] = decodeURIComponent(value).split(',')
  const start = from === '' ? 0 : parseClock(from)
  const end = to === undefined || to === '' ? null : parseClock(to)
  if (start === null || (to !== undefined && to !== '' && end === null)) return null
  if (end !== null && end <= start) return null
  return { start, end }
}

/**
 * Finds a deep link in a page URL's hash: `#ml-t=42,52`, with `&ml-player=<id>` naming the one player
 * it is for. This is what `@munsonlabs/reel`'s `clipLink()` writes. The keys are namespaced so they
 * never clash with the page's own, and the hash (never the query) carries them so servers, caches and
 * crawlers see one URL per page. Hash parts are `&`-separated, so a single-page app's own hash route
 * can sit in front: `#/article&ml-t=42,52`.
 */
export function parseDeepLink(location: { hash: string }): DeepLink | null {
  const hash = new Map<string, string>()
  for (const part of location.hash.replace(/^#/, '').split('&')) {
    const equals = part.indexOf('=')
    if (equals > 0) hash.set(part.slice(0, equals), part.slice(equals + 1))
  }
  const raw = hash.get('ml-t')
  if (raw == null) return null
  const range = parseRange(raw)
  if (!range) return null
  const target = hash.has('ml-player') ? decodeURIComponent(hash.get('ml-player')!) : null
  return { ...range, target: target || null }
}
