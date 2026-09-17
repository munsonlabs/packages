import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { playwright } from 'vite-plus/test/browser-playwright'
import type { UserConfig } from 'vite-plus'

const has = (path: string) => existsSync(resolve(process.cwd(), path))
const setup = (path: string) => (has(path) ? [path] : [])

const unit = {
  environment: 'happy-dom',
  globals: true,
  execArgv: ['--no-experimental-webstorage'],
  setupFiles: setup('test/setup.ts'),
}

const browser = {
  include: ['test/browser/**/*.spec.ts'],
  setupFiles: ['vitest-browser-vue', ...setup('test/browser/setup.ts')],
  browser: {
    enabled: true,
    viewport: { width: 1280, height: 900 },
    instances: [
      { browser: 'chromium' as const, provider: playwright() },
      { browser: 'webkit' as const, provider: playwright() },
    ],
  },
}

/** A `test/browser` directory adds a second project that runs its specs in real Chromium and WebKit. */
export const test: UserConfig['test'] = has('test/browser')
  ? {
      passWithNoTests: true,
      projects: [
        { extends: true, test: { ...unit, name: 'unit', include: ['test/**/*.spec.ts'], exclude: ['test/browser/**'] } },
        { extends: true, test: { ...browser, name: 'browser' } },
      ],
    }
  : unit
