import { defineElements } from './SigilElement'

/**
 * Importing this entry defines `<ml-sigil>` straight away, which is what most pages want. Importing it
 * with `?defer` on the specifier skips that so the page can register libraries first and call
 * `defineElements()` itself - useful when tags are already in the HTML and should not upgrade before
 * their icons can resolve.
 */
const deferred = typeof import.meta.url === 'string' && new URL(import.meta.url).searchParams.has('defer')
if (!deferred) {
  defineElements()
}

export { defineElements, SigilElement } from './SigilElement'
export { createIconNode } from './render'
