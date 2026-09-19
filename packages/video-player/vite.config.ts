import base from '@munsonlabs/shipkit/vite/vue.config'

const { pack: basePack = {}, ...baseConfig } = base as any

function elementEntry(name: string, cssFileName?: string) {
  return {
    ...basePack,
    outDir: 'dist/elements',
    deps: {
      neverBundle: ['vue'],
      alwaysBundle: [/\.css$/, '@vimeo/player', /^@munsonlabs\/sigil/],
    },
    entry: {
      [name]: `src/elements/${name}.ts`,
    },
    ...(cssFileName
      ? {
          css: { ...basePack.css, fileName: cssFileName },
        }
      : {}),
  }
}

const afterTask = (command: string, extra = {}) => ({
  command,
  dependsOn: ['@munsonlabs/sigil#build'],
  ...extra,
})

export default {
  ...baseConfig,
  run: {
    tasks: {
      build: afterTask('vp pack'),
      check: afterTask('vp check'),
      test: afterTask('vp test'),
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
