/**
 * Which player answered which deep link. A link without an `ml-player` id goes to the first
 * deep-link player that asks for it, so a page with several does not seek them all; the claim is
 * released when that player unmounts. Keyed by the link's own text, so a new hash is a new claim.
 */
const claims = new Map<string, symbol>()

/** True when `owner` holds (or now takes) the claim on `link`. */
export function claimDeepLink(link: string, owner: symbol): boolean {
  const holder = claims.get(link)
  if (holder && holder !== owner) return false
  claims.set(link, owner)
  return true
}

/** Drops every claim `owner` holds. */
export function releaseDeepLinks(owner: symbol): void {
  for (const [link, holder] of claims) {
    if (holder === owner) claims.delete(link)
  }
}
