import { mergeConfig } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'
import base from '@munsonlabs/shipkit/vite/vue.config'

export default mergeConfig(base, {
  test: {
    include: ['tests/e2e/**/*.spec.ts'],
    passWithNoTests: true,
    // These drive real playback of real remote video files in a real browser - running multiple
    // spec files' browser contexts concurrently starves the event loop enough to make timing-
    // sensitive assertions (seek position, play state) flaky. Not worth the parallelism here.
    fileParallelism: false,
    setupFiles: ['vitest-browser-vue', './tests/e2e/setup.ts'],
    browser: {
      enabled: true,
      provider: playwright({ launchOptions: process.env.CI ? { args: ['--no-sandbox'] } : {} }),
      instances: [{ browser: 'chromium' }],
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
      'test-e2e': {
        // Resolves `@munsonlabs/video-player` from its dist build, so a stale build silently
        // tests old code — this task's whole point is making that impossible to forget.
        command: 'vp test',
        dependsOn: ['@munsonlabs/video-player#build'],
        cache: false,
      },
      'test-page': {
        // Full-page Playwright run against the dev server; see playwright.config.ts.
        command: 'playwright test',
        dependsOn: ['@munsonlabs/video-player#build'],
        cache: false,
      },
    },
  },
})
