/**
 * Turns a URL into how you'd say it out loud: no scheme, www., query, hash or trailing slash.
 */
export function toReadableUrl(url: string): string {
  const { host, pathname } = new URL(url, globalThis.location?.href)
  const domain = host.replace(/^www\./, '')
  const path = pathname.replace(/\/$/, '')
  return domain + path
}
