const ELLIPSIS = '…'

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

function parts(url: string): { domain: string; segments: string[] } | null {
  const text = url.trim()
  let parsed: URL | null = null
  try {
    parsed = new URL(text)
  } catch {
    if (/^[^\s/:?#]+\.[^\s/?#]+(?:[/?#]\S*)?$/.test(text) || /^localhost(?::\d+)?(?:[/?#]\S*)?$/.test(text)) {
      try {
        parsed = new URL(`https://${text}`)
      } catch {
        parsed = null
      }
    }
  }
  if (!parsed || !parsed.host) {
    return null
  }
  const domain = parsed.host.replace(/^www\./i, '')
  const segments = parsed.pathname.split('/').filter(Boolean).map(decodeSegment)
  return { domain, segments }
}

const byLength = (text: string) => Array.from(text).length

/**
 * Middle-ellipsis until `measure` says it fits, keeping as much of both ends as possible (a little more
 * from the start).
 */
export function middleEllipsis(text: string, maxWidth: number, measure: (text: string) => number = byLength): string {
  if (measure(text) <= maxWidth) {
    return text
  }
  const chars = Array.from(text)
  let low = 0
  let high = chars.length - 1
  let best = ELLIPSIS
  // Binary search on how many characters to keep; head gets the odd one.
  while (low <= high) {
    const keep = Math.floor((low + high) / 2)
    const head = Math.ceil(keep / 2)
    const candidate = `${chars.slice(0, head).join('')}${ELLIPSIS}${chars.slice(chars.length - (keep - head)).join('')}`
    if (measure(candidate) <= maxWidth) {
      best = candidate
      low = keep + 1
    } else {
      high = keep - 1
    }
  }
  return best
}

/**
 * A URL as a person reads it out: no scheme, `www.`, query, hash or trailing slash, and the path
 * percent-decoded. With `maxWidth`, too long is shortened in the middle by whole path
 * segments first (`acme.news/2026/…/tides-rising`), then the last segment, then the whole text.
 * `measure` gives a width in `maxWidth`'s unit (characters by default; on a canvas
 * `(text) => ctx.measureText(text).width`). Text that is not a URL is returned as is, shortened the
 * same way.
 */
export function readableUrl(url: string, maxWidth?: number, measure: (text: string) => number = byLength): string {
  const parsed = parts(url)
  if (!parsed) {
    return maxWidth === undefined ? url : middleEllipsis(url, maxWidth, measure)
  }
  const { domain, segments } = parsed
  const full = [domain, ...segments].join('/')
  if (maxWidth === undefined || measure(full) <= maxWidth) {
    return full
  }
  if (segments.length === 0) {
    return middleEllipsis(full, maxWidth, measure)
  }
  const last = segments[segments.length - 1]
  // Keep as many leading segments as fit, dropping from the middle: domain/a/b/…/last.
  for (let keep = segments.length - 2; keep >= 0; keep--) {
    const candidate = [domain, ...segments.slice(0, keep), ELLIPSIS, last].join('/')
    if (measure(candidate) <= maxWidth) {
      return candidate
    }
  }
  // The slug itself is too long: keep the domain whole and cut the slug in its middle.
  const prefix = segments.length > 1 ? `${domain}/${ELLIPSIS}/` : `${domain}/`
  const room = maxWidth - measure(prefix)
  if (room > measure(`ab${ELLIPSIS}yz`)) {
    return `${prefix}${middleEllipsis(last, room, measure)}`
  }
  return middleEllipsis(full, maxWidth, measure)
}
