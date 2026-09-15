import { defineConfig } from '@playwright/test'

// Deliberately not the demo's usual dev port (5176): with `reuseExistingServer` a stray server on
// that port - e.g. a sibling checkout's dev server - would be tested instead of this one.
const PORT = 5199

/**
 * Full-page tests against the real demo app (index.html -> main.ts -> App.vue), as opposed to
 * the component-level suite under tests/e2e, which vitest runs in browser mode. Only this layer
 * can catch the app failing to boot, or panels interfering through the module-scoped singletons
 * (useEventLog, the stage registry, usePopover) that component tests mount in isolation.
 */
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
