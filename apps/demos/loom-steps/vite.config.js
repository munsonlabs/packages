import { fileURLToPath } from 'node:url'
import { mergeConfig } from 'vite-plus'
import ui from '@nuxt/ui/vite'
import base from '@munsonlabs/shipkit/vite/vue.config'

const pkg = (path) => fileURLToPath(new URL(`../../../packages/${path}`, import.meta.url))

/**
 * Loom (and, from its chapter on, Loom Studio) run from source, so whichever commit is checked
 * out is what you see. The video player runs from its build.
 */
const fromSource = [
  { find: /^@munsonlabs\/loom$/, replacement: pkg('loom/src/index.js') },
  { find: /^@munsonlabs\/loom\/editor$/, replacement: pkg('loom/src/editor.js') },
  { find: /^@munsonlabs\/loom\/video$/, replacement: pkg('loom/src/blocks/video/index.js') },
  { find: /^@munsonlabs\/loom\/icon$/, replacement: pkg('loom/src/blocks/icon/index.js') },
  { find: /^@munsonlabs\/loom\/style\.css$/, replacement: pkg('loom/src/theme/styles.css') },
  { find: /^@munsonlabs\/loom-studio$/, replacement: pkg('loom-studio/src/index.js') },
]

export default mergeConfig(base, {
  plugins: [
    ui({
      router: false,
      // Loom Studio uses Nuxt UI components by auto-import, so it's scanned like app code.
      scanPackages: ['@munsonlabs/loom-studio'],
      ui: { colors: { primary: 'orange', neutral: 'stone' } },
    }),
  ],
  resolve: { alias: fromSource },
  server: { port: 5214 },
  run: {
    tasks: {
      dev: { command: 'vp dev', dependsOn: ['@munsonlabs/video-player#build'] },
      build: { command: 'vp build', dependsOn: ['@munsonlabs/video-player#build'] },
    },
  },
})
