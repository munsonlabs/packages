import { defineConfig } from '@playwright/test'

// Deliberately not the demo's usual dev port (5176): with `reuseExistingServer` a stray server on
// that port - e.g. a sibling checkout's dev server - would be tested instead of this one.
const PORT = 5199

/** Full-page tests: the only layer that catches the app failing to boot or panels interfering through module-scoped singletons. */
export default defineConfig({
  testDir: 'tests/page',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: 'chromium',
    launchOptions: process.env.CI ? { args: ['--no-sandbox'] } : {},
  },
  webServer: {
    command: `npx vp dev --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
