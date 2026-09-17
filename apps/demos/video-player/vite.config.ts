import { mergeConfig } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'
import base from '@munsonlabs/shipkit/vite/vue.config'
import { perfMediaServer } from './tests/perf/mediaServer'

const PERF_FIXTURE = decodeURIComponent(new URL('./public/media/flower.mp4', import.meta.url).pathname)

export default mergeConfig(base, {
  plugins: [perfMediaServer(PERF_FIXTURE)],
  test: {
    include: ['tests/e2e/**/*.spec.ts'],
    passWithNoTests: true,
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
      'test-perf': {
        // Tap-to-play timing harness; see playwright.perf.config.ts and tests/perf/.
        command: 'playwright test --config playwright.perf.config.ts',
        dependsOn: ['@munsonlabs/video-player#build'],
        cache: false,
      },
    },
  },
})
