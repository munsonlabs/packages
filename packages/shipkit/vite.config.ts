import { defineConfig } from 'vite-plus'
import { resolve } from 'node:path'
import { lint, fmt, test } from './src/vite/shared/index.ts'

export default defineConfig({
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
  run: {
    tasks: {
      build: { command: 'vp pack' },
    },
  },
  pack: {
    deps: { resolveDepSubpath: true },
    dts: true,
    format: ['esm'],
    entry: ['src/bin/index.ts'],
  },
  lint,
  fmt,
  test,
})
