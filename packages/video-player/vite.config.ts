import base from '@munsonlabs/shipkit/vite/vue.config'

const { pack: basePack = {}, ...baseConfig } = base as any

function elementEntry(name: string, cssFileName?: string) {
  return {
    ...basePack,
    outDir: 'dist/elements',
    deps: { neverBundle: ['vue'], alwaysBundle: [/\.css$/, '@vimeo/player'] },
    entry: { [name]: `src/elements/${name}.ts` },
    ...(cssFileName ? { css: { ...basePack.css, fileName: cssFileName } } : {}),
  }
}

export default {
  ...baseConfig,
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
