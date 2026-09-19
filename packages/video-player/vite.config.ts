import base from '@munsonlabs/shipkit/vite/vue.config'

const { pack: basePack = {}, ...baseConfig } = base as any

function elementEntry(name: string, cssFileName?: string) {
  return {
    ...basePack,
    outDir: 'dist/elements',
    // sigil rides inside the element bundles so their only bare imports stay vue, hls.js and dashjs; a host
    // page's own copy of sigil still shares the registry with this one through globalThis.
    deps: { neverBundle: ['vue'], alwaysBundle: [/\.css$/, '@vimeo/player', /^@munsonlabs\/sigil/] },
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
