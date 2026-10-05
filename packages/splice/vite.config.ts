import base from '@munsonlabs/shipkit/vite/vue.config'
import { playwright } from 'vite-plus/test/browser-playwright'

const { pack: basePack = {}, test: baseTest = {}, ...baseConfig } = base as any

/**
 * Shipkit's browser project runs Chromium and WebKit. Splice's question is which browsers can make a
 * clip at all, so its browser project adds Firefox; `--browser.name=` still narrows to one engine.
 *
 * WebKit runs on its own, after Chromium and Firefox (its own `sequence.groupOrder`). Every engine
 * encodes H.264 with macOS's hardware encoder, which the whole machine shares, and with all three
 * exporting at once it runs short: Chromium's `VideoEncoder` fails with "Encoding error." and WebKit's
 * takes frames and never outputs. WebKit alone retries a failed spec, twice: its real media under load
 * fails in ways no wait in a test can fix. The global setup serves logos and captions from another
 * origin, with and without CORS headers.
 */
const projects = (baseTest.projects ?? []).map((project: any) => {
  if (project.test?.name !== 'browser') return project
  const instances = [
    ...project.test.browser.instances.map((instance: any) =>
      instance.browser === 'webkit' ? { ...instance, sequence: { groupOrder: 1 }, retry: 2 } : instance,
    ),
    { browser: 'firefox' as const, provider: playwright() },
  ]
  return { ...project, test: { ...project.test, globalSetup: ['test/browser/global-setup.ts'], browser: { ...project.test.browser, instances } } }
})

/**
 * The editor is built on @munsonlabs/video-player and draws the player's sigil icons, so every task
 * waits for both to build.
 */
const afterTask = (command: string, extra = {}) => ({
  command,
  dependsOn: ['@munsonlabs/sigil#build', '@munsonlabs/video-player#build'],
  ...extra,
})

export default {
  ...baseConfig,
  run: {
    tasks: {
      build: afterTask('vp pack'),
      check: afterTask('vp check'),
      test: afterTask('vp test', { cache: false }),
    },
  },
  test: { ...baseTest, projects },
  // The core and the Vue editor; the editor's styles land in dist/style.css (`./style`). Mediabunny
  // loads with the core, and Vue and the player are the editor's peers.
  pack: {
    ...basePack,
    entry: { index: 'src/index.ts', vue: 'src/vue.ts' },
    deps: { ...basePack.deps, neverBundle: ['mediabunny', 'vue', '@munsonlabs/video-player'] },
  },
}
