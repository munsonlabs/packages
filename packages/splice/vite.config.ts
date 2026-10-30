import base from '@munsonlabs/shipkit/vite/vue.config'
import { playwright } from 'vite-plus/test/browser-playwright'

const { pack: basePack = {}, test: baseTest = {}, ...baseConfig } = base as any

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
  test: {
    ...baseTest,
    projects,
  },
  pack: [
    {
      ...basePack,
      entry: { index: 'src/index.ts', vue: 'src/vue.ts' },
    },
    {
      ...basePack,
      outDir: 'dist/elements',
      deps: {
        neverBundle: ['vue', '@munsonlabs/video-player', 'mediabunny'],
        alwaysBundle: [/\.css$/, /^@munsonlabs\/sigil/],
      },
      entry: { index: 'src/elements/index.ts' },
    },
  ],
}
