import { defineConfig } from '@playwright/test'

// Its own port for the same reason playwright.config.ts uses 5199: never test a stray server.
export const PERF_PORT = 5198

/**
 * Tap-to-play timing harness - see tests/perf/tapToPlay.spec.ts. Separate from the functional
 * page suite so it can run serially, with retries off and a fixed viewport, and so `npm run
 * test:perf` is one command. Numbers are printed and written to test-results/perf/.
 */
export default defineConfig({
  testDir: 'tests/perf',
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PERF_PORT}`,
    browserName: 'chromium',
    viewport: { width: 1280, height: 900 },
    launchOptions: {
      args: [
        // Keeps the page offline apart from the dev server (Prebid, CDN posters, embeds all fail
        // fast). Done at the resolver rather than with page.route(): Chromium disables its HTTP
        // cache while request interception is on, which would hide exactly what this harness measures.
        '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1',
        ...(process.env.CI ? ['--no-sandbox'] : []),
      ],
    },
  },
  webServer: {
    // Dual-stack bind: the page loads from localhost but the media comes from 127.0.0.1 (tests/perf/mediaServer.ts),
    // and a plain `localhost` bind can land on ::1 only, leaving 127.0.0.1 unreachable.
    command: `npx vp dev --port ${PERF_PORT} --strictPort --host ::`,
    url: `http://localhost:${PERF_PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    // PERF_DEBUG=1 also surfaces the media server's per-request range log (tests/perf/mediaServer.ts).
    stdout: process.env.PERF_DEBUG ? 'pipe' : 'ignore',
  },
})
