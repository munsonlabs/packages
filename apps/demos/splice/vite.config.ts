import { mergeConfig } from 'vite-plus'
import base from '@munsonlabs/shipkit/vite/vue.config'

const afterTask = (command: string, extra = {}) => ({
  command,
  dependsOn: ['@munsonlabs/video-player#build', '@munsonlabs/splice#build'],
  ...extra,
})

export default mergeConfig(base, {
  run: {
    tasks: {
      dev: afterTask('vp dev --port 5177'),
      build: afterTask('vp build', { env: ['VITE_BASE_SPLICE_DEMO'] }),
      check: afterTask('vp check'),
    },
  },
})
