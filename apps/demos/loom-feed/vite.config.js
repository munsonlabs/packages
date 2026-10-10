import { mergeConfig } from 'vite-plus'
import ui from '@nuxt/ui/vite'
import base from '@munsonlabs/shipkit/vite/vue.config'
import { loomFromSource } from 'timeline-kit/vite'

export default mergeConfig(base, {
  plugins: [ui({ router: false, ui: { colors: { primary: 'orange', neutral: 'stone' } } })],
  resolve: { alias: loomFromSource },
  run: {
    tasks: {
      // The video player is used from its build.
      dev: { command: 'vp dev --port 5195', dependsOn: ['@munsonlabs/video-player#build'] },
      build: { command: 'vp build', dependsOn: ['@munsonlabs/video-player#build'] },
    },
  },
})
