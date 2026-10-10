import Icon, { spec } from './Icon.vue'

/**
 * An `Icon` block for kits that want icons, drawn by `@munsonlabs/sigil`. Its own entry, so
 * only apps that use it load sigil. Register an icon library with sigil before rendering:
 *
 * ```js
 * import { register } from '@munsonlabs/sigil'
 * register('lucide', { resolver: (name) => `https://cdn.jsdelivr.net/npm/lucide-static/icons/${name}.svg` }, { default: true })
 *
 * createKit({ blocks: [iconBlock], ... })
 * ```
 */
export const iconBlock = { ...spec, component: Icon }
