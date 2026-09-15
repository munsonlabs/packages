import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

export interface InlineCssOptions {
  dir?: string
}

// Matches a quoted `__INLINE_CSS(<path>)__` string literal in whichever quote style minification
// left it in (including backticks) — the string content itself is never touched by a minifier,
// only its quoting. `\1` backreferences the opening quote so mismatched pairs don't match.
const MARKER_PATTERN = /(['"`])__INLINE_CSS\(([^)]+)\)__\1/g

/**
 * Replaces every `__INLINE_CSS(<path>)__` marker in a built JS chunk with the content of the CSS
 * file at `<path>` (relative to the build's own output dir), embedded as a string literal. No-op
 * if the marker is absent, so it's safe to include unconditionally in a shared config (see
 * vue/pack.ts) - including one shared `plugins` array reused, by object reference, across several
 * pack configs in the same package (each spreads `...basePack` without its own `plugins`
 * override). Those builds run CONCURRENTLY, so this holds no state between hooks: everything it
 * needs comes from `writeBundle`'s own arguments. An earlier version stashed `dir`/
 * `chunkFileNames` in `generateBundle` for `closeBundle` to read, which one build would overwrite
 * while another was still mid-flight — it survived locally and failed on CI's smaller runner,
 * where the interleaving differs.
 *
 * For light-DOM custom elements (`defineCustomElement(Comp, { shadowRoot: false })`) that need
 * their CSS to travel inside the JS rather than as a separate file — locating a sibling CSS file
 * via the running module's own `import.meta.url` breaks on CDNs that rewrite module paths (e.g.
 * esm.sh). Runs in `writeBundle` (after this build's output is on disk) rather than `generateBundle`,
 * since the in-memory bundle doesn't reliably expose CSS assets across this monorepo's bundlers.
 *
 * @example
 * const EMBEDDED_STYLE = '__INLINE_CSS(style.css)__' // replaced at build time
 */
export function inlineCss({ dir: fallbackDir = 'dist' }: InlineCssOptions = {}): Plugin {
  return {
    name: 'shipkit:inline-css',
    writeBundle(outputOptions, bundle) {
      const dir = outputOptions.dir ?? fallbackDir
      const chunkFileNames = Object.values(bundle)
        .filter((file) => file.type === 'chunk')
        .map((file) => file.fileName)

      for (const fileName of chunkFileNames) {
        const jsPath = join(dir, fileName)
        if (!existsSync(jsPath)) continue

        const js = readFileSync(jsPath, 'utf8')
        if (!MARKER_PATTERN.test(js)) continue
        MARKER_PATTERN.lastIndex = 0 // reset after .test()'s stateful lastIndex (global regex)

        const replaced = js.replace(MARKER_PATTERN, (match, _quote, cssRelPath) => {
          const cssPath = join(dir, cssRelPath)
          if (!existsSync(cssPath)) {
            throw new Error(`shipkit:inline-css: "${cssRelPath}" referenced by ${match} in ${fileName} does not exist`)
          }
          return JSON.stringify(readFileSync(cssPath, 'utf8'))
        })

        writeFileSync(jsPath, replaced)
      }
    },
  }
}
