import base from '@munsonlabs/shipkit/vite/vue.config'
import { playwright } from 'vite-plus/test/browser-playwright'

const { test: baseTest, pack: basePack = {}, ...baseConfig } = base as any

function elementEntry(name: string, cssFileName?: string) {
  return {
    ...basePack,
    outDir: 'dist/elements',
    deps: { neverBundle: ['vue'], alwaysBundle: [/\.css$/, '@vimeo/player'] },
    entry: { [name]: `src/elements/${name}.ts` },
    ...(cssFileName ? { css: { ...basePack.css, fileName: cssFileName } } : {}),
  }
}

const unitProject = {
  extends: true,
  test: { ...baseTest, name: 'unit', include: ['test/**/*.spec.ts'], exclude: ['test/browser/**'] },
}

const browserProject = {
  extends: true,
  test: {
    name: 'browser',
    include: ['test/browser/**/*.spec.ts'],
    setupFiles: ['vitest-browser-vue', './test/browser/setup.ts'],
    browser: {
      enabled: true,
      viewport: { width: 1280, height: 900 },
      instances: [
        { browser: 'chromium', provider: playwright() },
        { browser: 'webkit', provider: playwright() },
      ],
    },
  },
}

export default {
  ...baseConfig,
  test: {
    projects: [unitProject, browserProject],
  },
  run: {
    tasks: {
      build: {
        command: 'vp pack',
      },
    },
  },
  pack: [
    { ...basePack, entry: { index: 'src/index.ts' } },
    elementEntry('index'),
    elementEntry('core', 'core.css'),
    elementEntry('controls', 'controls.css'),
  ],
}
