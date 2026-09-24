import { defineElements } from './SigilElement'

/**
 * Defines `<ml-sigil-icon>` on import. Import with `?defer` on the specifier to skip that and call
 * `defineElements()` yourself instead.
 */
const deferred = typeof import.meta.url === 'string' && new URL(import.meta.url).searchParams.has('defer')
if (!deferred) {
  defineElements()
}

export { defineElements, SigilElement } from './SigilElement'
export { createIconNode } from './render'
