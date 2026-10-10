import { fileURLToPath } from 'node:url'
import base from '@munsonlabs/shipkit/vite/vue.config'

const basePack = base.pack ?? {}
const loomSrc = (path) => fileURLToPath(new URL(`../loom/src/${path}`, import.meta.url))

export default {
  ...base,
  resolve: {
    // The tests run loom from source, next to shipkit's `@/` and `@test/`.
    alias: [
      ...Object.entries(base.resolve.alias).map(([find, replacement]) => ({ find, replacement })),
      { find: /^@munsonlabs\/loom$/, replacement: loomSrc('index.js') },
      { find: /^@munsonlabs\/loom\/editor$/, replacement: loomSrc('editor.js') },
    ],
  },
  pack: {
    ...basePack,
    dts: false,
    entry: { index: 'src/index.js' },
    // Nuxt UI stays external, and its components are left to the host app's Nuxt UI plugin to auto-import
    // (with `scanPackages: ['@munsonlabs/loom-studio']`), which is what swaps in the Vue builds of UIcon/ULink.
    deps: { neverBundle: ['vue', /^@nuxt\/ui/, /^@vueuse\//, /^@munsonlabs\/loom(\/|$)/], alwaysBundle: [/\.css$/] },
  },
}
