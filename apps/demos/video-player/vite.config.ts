import { mergeConfig } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'
import base from '@munsonlabs/shipkit/vite/vue.config'

// Every task runs against the player's dist build, so a stale build can never silently test old code.
const afterPlayerBuild = (command: string, extra = {}) => ({ command, dependsOn: ['@munsonlabs/video-player#build'], ...extra })

export default mergeConfig(base, {
  test: {
    include: ['tests/e2e/**/*.spec.ts', 'tests/page/**/*.spec.ts'],
    passWithNoTests: true,
    setupFiles: ['vitest-browser-vue', './tests/setup.ts'],
    browser: {
      enabled: true,
      viewport: { width: 1280, height: 900 },
      instances: [
        { browser: 'chromium', provider: playwright() },
        { browser: 'webkit', provider: playwright() },
      ],
    },
  },
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
