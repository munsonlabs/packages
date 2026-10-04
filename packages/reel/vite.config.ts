import base from '@munsonlabs/shipkit/vite/vue.config'
import { playwright } from 'vite-plus/test/browser-playwright'

const { pack: basePack = {}, test: baseTest = {}, ...baseConfig } = base as any

/**
 * Shipkit's browser project runs Chromium and WebKit. Reel's question is which browsers can make a
 * clip at all, so its browser project adds Firefox; `--browser.name=` still narrows to one engine.
 *
 * WebKit runs on its own, after Chromium and Firefox (its own `sequence.groupOrder`; vitest runs
 * groups one after another). Every engine encodes H.264 with macOS's hardware encoder, which the
 * whole machine shares. With all three exporting at once it runs short: Chromium's `VideoEncoder`
 * then fails with "Encoding error.", and WebKit's takes frames and never outputs or errors, so the
 * spec hangs until its timeout, and later encoders in that browser tend to stall as well. CPU load alone
 * never caused this; three engines exporting at once did. `sequence` is not in the instance type, but
 * vitest merges it like any other per-instance option.
 */
const projects = (baseTest.projects ?? []).map((project: any) => {
  if (project.test?.name !== 'browser') {
    return project
  }
  const instances = [
    // WebKit alone retries a failed spec, twice. Its real media under load fails in ways no wait in a
    // test can fix: the hardware encoder stall above, and native MPEG-TS HLS that now and then reports
    // "Media failed to decode" in Playwright's WebKit. Chromium and Firefox keep no retries, so a real
    // bug still fails there at once; REEL_CODECS and the waits' messages log each failed attempt.
    ...project.test.browser.instances.map((instance: any) =>
      instance.browser === 'webkit' ? { ...instance, sequence: { groupOrder: 1 }, retry: 2 } : instance,
    ),
    { browser: 'firefox' as const, provider: playwright() },
  ]
  // The global setup serves logos from another origin, with and without CORS headers.
  return { ...project, test: { ...project.test, globalSetup: ['test/browser/global-setup.ts'], browser: { ...project.test.browser, instances } } }
})

/**
 * The picker is built on @munsonlabs/video-player and draws the player's sigil icons, and tests and
 * the build resolve both from their dist, so every task waits for them.
 */
const afterTask = (command: string, extra = {}) => ({
  command,
  dependsOn: ['@munsonlabs/sigil#build', '@munsonlabs/video-player#build'],
  ...extra,
})

/** Never in reel's own files: Mediabunny loads with the core, Vue and the player are the picker's peers. */
const external = ['mediabunny', 'vue', '@munsonlabs/video-player']

export default {
  ...baseConfig,
  run: {
    tasks: {
      build: afterTask('vp pack'),
      check: afterTask('vp check'),
      // Uncached: a cached task runs with file-access tracking, and under it Firefox's media decoder
      // fails (MEDIA_ERR_DECODE) from the second video a test page plays, failing every later spec.
      test: afterTask('vp test', { cache: false }),
    },
  },
  // Dynamically imported modules would otherwise be discovered mid-run, and the dependency
  // re-optimisation reloads the browser test page under the running specs. hls.js is the player's,
  // imported when a picker previews HLS outside Safari.
  optimizeDeps: { include: ['hls.js'] },
  test: { ...baseTest, projects },
  pack: [
    // The core and the Vue components. The components' styles land in dist/style.css (`./style`).
    {
      ...basePack,
      entry: { index: 'src/index.ts', vue: 'src/vue.ts' },
      deps: { ...basePack.deps, neverBundle: external },
    },
    // As video-player's element builds do, the element carries its own sigil and its CSS inlined into
    // the JS, so one import gives a working picker. Vue and the player stay external peers, shared
    // with the page's own copies, and the page already has the player's stylesheet.
    {
      ...basePack,
      outDir: 'dist/elements',
      entry: { element: 'src/elements/index.ts' },
      deps: { neverBundle: external, alwaysBundle: [/\.css$/, /^@munsonlabs\/sigil/] },
    },
  ],
}
