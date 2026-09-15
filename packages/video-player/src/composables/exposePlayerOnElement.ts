/**
 * Copies a template-ref'd VideoPlayer/VideoCard/VideoStage's exposed API directly onto a real DOM
 * element, live - not a one-time snapshot - so code with no access to your Vue app's internals
 * (e.g. a `<ml-controls-*>` custom element loaded from a completely separate script/bundle, via
 * `for="id"` or its `player` property) can read/call it the exact same way it would on a genuine
 * custom element. That's the one thing a plain Vue SFC's `defineExpose` doesn't do on its own -
 * its exposed state only exists on the Vue component instance, never on the underlying DOM node,
 * unless something (this) puts it there.
 *
 * Deliberately takes no dependency on `useForwardedPlayer`'s exact key list: `player` here is
 * whatever a template ref actually gives you (Vue wraps a component's exposed object for external
 * template-ref access the same way it does for defineCustomElement, auto-unwrapping any `computed`
 * state fields on read) - copying every one of its own keys, whatever they are, keeps this correct
 * even if the exposed shape changes later, and works identically for VideoPlayer/VideoCard/
 * VideoStage, since all three expose the same shape.
 *
 * Call once, after the player has actually mounted (e.g. in onMounted) - `el` can be the player's
 * own wrapper or any other element (a plain sibling `<div id="...">`, for instance); nothing about
 * this requires `el` to be part of the player's own DOM structure.
 */
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
