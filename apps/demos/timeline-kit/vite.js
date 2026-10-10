import { fileURLToPath } from 'node:url'

const pkg = (path) => fileURLToPath(new URL(`../../../packages/${path}`, import.meta.url))

/**
 * Aliases that run loom from source in the demos, so there's no build step.
 * Not via the `source` export condition: that would also send `@munsonlabs/video-player` to a
 * source tree that relies on its own `@/` alias. The video player runs from its build.
 */
export const loomFromSource = [
  { find: /^@munsonlabs\/loom$/, replacement: pkg('loom/src/index.js') },
  { find: /^@munsonlabs\/loom\/editor$/, replacement: pkg('loom/src/editor.js') },
  { find: /^@munsonlabs\/loom\/video$/, replacement: pkg('loom/src/blocks/video/index.js') },
  { find: /^@munsonlabs\/loom\/icon$/, replacement: pkg('loom/src/blocks/icon/index.js') },
  { find: /^@munsonlabs\/loom\/style\.css$/, replacement: pkg('loom/src/theme/styles.css') },
]
