import { getLibEntries } from '../../utils/entries.ts'
import vue from '@vitejs/plugin-vue'
import { inlineCss } from './inline-css.ts'

export const pack = {
  minify: true,
  dts: { vue: true, compilerOptions: { removeComments: true } },
  entry: getLibEntries(),
  format: ['es' as const],
  plugins: [vue(), inlineCss()],
  deps: {
    neverBundle: ['vue'],
    alwaysBundle: (id: string) => id.endsWith('.css'),
  },
  css: {
    minify: true,
  },
  outputOptions: {
    comments: { jsdoc: false },
    chunkFileNames: 'chunks/[name]-[hash].mjs',
  },
}
