import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import type { UserConfig } from 'vite'

export interface CustomElementConfigOptions {
  entry: string
  fileName?: string
  /** Packages to exclude from the bundle (for import-map deployments). */
  externals?: string[]
}

/**
 * Vite config for building a standalone custom element ESM bundle.
 * Bundles everything (Vue, dependencies) — no externals.
 * Safe to run alongside `vp pack` as it sets emptyOutDir: false.
 *
 * @example
 * // vite.config.ce.ts
 * import { defineCustomElementConfig } from '@munsonlabs/shipkit/vite/ce.config'
 * import { resolve } from 'node:path'
 * export default defineCustomElementConfig({
 *   entry: resolve(import.meta.dirname, 'src/ml-card.ts'),
 * })
 */
export function defineCustomElementConfig({ entry, fileName = 'ml-card', externals = [] }: CustomElementConfigOptions): UserConfig {
  return defineConfig({
    // customElement: true inlines <style> blocks as strings on each component
    // so Vue's VueElement injects them into the shadow root, not document.head
    plugins: [vue({ customElement: true })],
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      lib: {
        entry,
        formats: ['es'],
        fileName: () => `${fileName}.js`,
      },
      outDir: 'dist',
      emptyOutDir: false,
      rollupOptions: externals.length ? { external: externals } : undefined,
    },
  })
}
