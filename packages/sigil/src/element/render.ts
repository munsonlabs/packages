import type { ResolvedIcon } from '../types/index'

/**
 * Turns a resolved icon into a DOM node: the described tag, its class, `aria-hidden`, and then
 * either the markup as `innerHTML` or the text as content.
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
