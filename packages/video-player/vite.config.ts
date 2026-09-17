import base from '@munsonlabs/shipkit/vite/vue.config'
import { playwright } from 'vite-plus/test/browser-playwright'

const basePack = (base as any).pack ?? {}

/**
 * Each element bundle is its own build so index/core/controls stand alone for CDN consumers (no
 * shared hashed chunk between them) and core.css/controls.css stay separate. `cssFileName` names
 * this build's CSS; omitted, the combined `index` bundle keeps `style.css` and injects it itself.
 */
function elementEntry(name: string, cssFileName?: string) {
  return {
    ...basePack,
    outDir: 'dist/elements',
    deps: {
      neverBundle: ['vue'],
      alwaysBundle: [/\.css$/, '@vimeo/player'],
    },
    entry: { [name]: `src/elements/${name}.ts` },
    ...(cssFileName ? { css: { ...basePack.css, fileName: cssFileName } } : {}),
  }
}

const { test: unitTest, ...baseConfig } = base as any

export default {
  ...baseConfig,
  test: {
    projects: [
      { extends: true, test: { ...unitTest, name: 'unit', include: ['test/**/*.spec.ts'], exclude: ['test/browser/**'] } },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['test/browser/**/*.spec.ts'],
          setupFiles: ['vitest-browser-vue', './test/browser/setup.ts'],
          browser: {
            enabled: true,
            viewport: { width: 1280, height: 900 },
            instances: [
              {
                browser: 'chromium',
                // Offline apart from the dev server, so nothing external can hang a test.
                provider: playwright({
                  launchOptions: {
                    args: [
                      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1',
                      ...(process.env.CI ? ['--no-sandbox'] : []),
                    ],
                  },
                }),
              },
              { browser: 'webkit', provider: playwright() },
            ],
          },
        },
      },
    ],
  },
  run: {
    tasks: {
      build: { command: 'vp pack' },
    },
  },
  pack: [
    {
      ...basePack,
      entry: { index: 'src/index.ts' },
    },
    elementEntry('index'),
    elementEntry('core', 'core.css'),
    elementEntry('controls', 'controls.css'),
  ],
}
