import { mergeConfig } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'
import base from '@munsonlabs/shipkit/vite/vue.config'
export default mergeConfig(base, {
  test: {
    include: ['tests/e2e/**/*.spec.ts', 'tests/page/**/*.spec.ts'],
    passWithNoTests: true,
    setupFiles: ['vitest-browser-vue', './tests/setup.ts'],
    browser: {
      enabled: true,
      viewport: { width: 1280, height: 900 },
      instances: [
        {
          browser: 'chromium',
          // Offline apart from the dev server, so Prebid, CDN posters and embeds fail fast.
          provider: playwright({
            launchOptions: {
              args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1', ...(process.env.CI ? ['--no-sandbox'] : [])],
            },
          }),
        },
        { browser: 'webkit', provider: playwright() },
      ],
    },
  },
  run: {
    tasks: {
      dev: {
        command: 'vp dev --port 5176',
        dependsOn: ['@munsonlabs/video-player#build'],
      },
      build: {
        command: 'vp build',
        dependsOn: ['@munsonlabs/video-player#build'],
        // Sets `base`, so it must be part of the cache key.
        env: ['VITE_BASE_VIDEO_PLAYER_DEMO'],
      },
      check: {
        command: 'vp check',
        dependsOn: ['@munsonlabs/video-player#build'],
      },
      test: {
        command: 'vp test',
        dependsOn: ['@munsonlabs/video-player#build'],
        cache: false,
      },
    },
  },
})
