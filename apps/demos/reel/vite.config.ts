import { mergeConfig } from 'vite-plus'
import base from '@munsonlabs/shipkit/vite/vue.config'

/** The demo runs against both packages' dist builds, so every task waits for them. */
const afterTask = (command: string, extra = {}) => ({
  command,
  dependsOn: ['@munsonlabs/video-player#build', '@munsonlabs/reel#build'],
  ...extra,
})

export default mergeConfig(base, {
  run: {
    tasks: {
      dev: afterTask('vp dev --port 5177'),
      build: afterTask('vp build', { env: ['VITE_BASE_REEL_DEMO'] }),
      check: afterTask('vp check'),
    },
  },
})
