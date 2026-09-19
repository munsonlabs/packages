import type { ResolvedIcon } from '../types/index'

/**
 * Turns a resolved icon into a DOM node: the described tag, its class, `aria-hidden` (icons are
 * decorative; the accessible name belongs on the control around them), and then either the markup as
 * `innerHTML` or the text as content. The Vue renderer produces the same structure with `h()`; the two
 * must stay in step so an icon looks identical whichever host renders it.
 */
export function createIconNode({ tag, className, html, text }: ResolvedIcon, doc: Document = document): HTMLElement {
  const el = doc.createElement(tag)
  el.setAttribute('aria-hidden', 'true')

  if (className) {
    el.className = className
  }

  if (html !== undefined) {
    el.innerHTML = html
  } else if (text !== undefined) {
    el.textContent = text
  }

  return el
}
