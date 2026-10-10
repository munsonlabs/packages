import { mergeConfig } from 'vite-plus'
import ui from '@nuxt/ui/vite'
import base from '@munsonlabs/shipkit/vite/vue.config'
import { loomFromSource } from 'timeline-kit/vite'

export default mergeConfig(base, {
  plugins: [
    ui({
      router: false,
      // Loom Studio uses Nuxt UI components by auto-import, so it's scanned like app code.
      scanPackages: ['@munsonlabs/loom-studio'],
      ui: { colors: { primary: 'violet', neutral: 'zinc' } },
    }),
  ],
  resolve: { alias: loomFromSource },
  run: {
    tasks: {
      // The video player is used from its build.
      dev: { command: 'vp dev --port 5189', dependsOn: ['@munsonlabs/video-player#build'] },
      build: { command: 'vp build', dependsOn: ['@munsonlabs/video-player#build'] },
    },
  },
})
