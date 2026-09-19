import { mergeConfig } from 'vite-plus'
import base from '@munsonlabs/shipkit/vite/vue.config'

const afterTask = (command: string, extra = {}) => ({
  command,
  dependsOn: ['@munsonlabs/video-player#build'],
  ...extra,
})

export default mergeConfig(base, {
  run: {
    tasks: {
      dev: afterTask('vp dev --port 5176'),
      build: afterTask('vp build', { env: ['VITE_BASE_VIDEO_PLAYER_DEMO'] }),
      check: afterTask('vp check'),
      test: afterTask('vp test', { cache: false }),
    },
  },
})
