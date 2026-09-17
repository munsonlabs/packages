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
      // `vp test --browser.name=chromium|webkit` narrows to one engine; CI does, one per matrix entry.
      instances: [
        {
          browser: 'chromium',
          // Offline apart from the dev server: Prebid, CDN posters and embeds fail fast instead of hanging tests.
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
        // Sets `base`, so it has to be fingerprinted — otherwise a cached
        // root-relative build gets restored over a sub-path one.
        env: ['VITE_BASE_VIDEO_PLAYER_DEMO'],
      },
      check: {
        // Types for `@munsonlabs/video-player` come from its dist build, so on a
        // clean checkout there is nothing to resolve without this.
        command: 'vp check',
        dependsOn: ['@munsonlabs/video-player#build'],
      },
      // Both depend on the package's dist build, so a stale build can never silently test old code.
      test: {
        command: 'vp test',
        dependsOn: ['@munsonlabs/video-player#build'],
        cache: false,
      },
    },
  },
})
