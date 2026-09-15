import base from '@munsonlabs/shipkit/vite/vue.config'

const basePack = (base as any).pack ?? {}

/**
 * One pack config for `src/elements/<name>.ts`, output to dist/elements/<name>.{mjs,d.mts} - each
 * gets its own build (not a single multi-entry one) so shared dependencies between them (e.g.
 * PlayButton.vue) don't get factored into a content-hashed shared chunk, which would break both
 * the "index/core/controls each stand alone" guarantee for CDN/`<script type=module>` consumers
 * (importing exactly one of the three should never require fetching code the others pulled in)
 * and the separate core.css/controls.css the `./style/core`/`./style/controls` exports rely on.
 *
 * This doesn't rule out splitting *within* one entry: index.mjs/core.mjs each dynamically
 * `import()` their own platform adapters (adapters/index.ts), landing in dist/elements/chunks/ -
 * shared between those two specifically (both need the same adapters), never with controls.mjs
 * (which doesn't touch adapters/index.ts at all). Self-hosting index.mjs/core.mjs means serving
 * that chunks/ directory alongside them; a directory-serving CDN (jsdelivr/unpkg/esm.sh) needs no
 * special handling.
 *
 * `cssFileName` is optional: omit it to keep the default 'style.css' (the combined `index` bundle,
 * which auto-injects its own CSS); pass it to name this build's CSS output after itself instead
 * (core.css/controls.css), doubling as the un-embedded copy `./style/core`/`./style/controls` use.
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

export default {
  ...base,
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
