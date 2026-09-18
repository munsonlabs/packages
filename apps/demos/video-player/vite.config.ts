import { mergeConfig } from 'vite-plus'
import base from '@munsonlabs/shipkit/vite/vue.config'

// Every task runs against the player's dist build, so a stale build can never silently test old code.
const afterPlayerBuild = (command: string, extra = {}) => ({ command, dependsOn: ['@munsonlabs/video-player#build'], ...extra })

export default mergeConfig(base, {
  run: {
    tasks: {
      dev: afterPlayerBuild('vp dev --port 5176'),
      // Sets `base`, so it must be part of the cache key.
      build: afterPlayerBuild('vp build', { env: ['VITE_BASE_VIDEO_PLAYER_DEMO'] }),
      check: afterPlayerBuild('vp check'),
      test: afterPlayerBuild('vp test', { cache: false }),
    },
  },
})
