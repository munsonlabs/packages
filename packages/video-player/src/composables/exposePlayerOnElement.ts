/** Mirrors a mounted player's exposed API onto a DOM element as live getters, so non-Vue code (e.g. an `ml-controls-*` element via `for="id"`) can drive it. */
export function exposePlayerOnElement(el: Element, player: object | null | undefined): void {
  if (!player) return
  for (const key of Object.keys(player)) {
    const value = (player as Record<string, unknown>)[key]
    if (typeof value === 'function') {
      ;(el as unknown as Record<string, unknown>)[key] = value
    } else {
      Object.defineProperty(el, key, {
        get: () => (player as Record<string, unknown>)[key],
        enumerable: true,
        configurable: true,
      })
    }
  }
}
