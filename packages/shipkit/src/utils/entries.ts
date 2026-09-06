import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { readPackageJson } from './package.ts'

/**
 * Derive library entry points from package.json exports.
 * Falls back to src/index.ts if no exports field is present.
 */
export function getLibEntries(): Record<string, string> {
  if (!process.env.AUTO_ENTRIES) return {}
  const pkg = readPackageJson()
  const src = resolve(process.cwd(), 'src')

  if (!pkg.exports) {
    return { index: resolve(src, 'index.ts') }
  }

  const entries: Record<string, string> = {}
  for (const [key, value] of Object.entries(pkg.exports)) {
    const importPath = typeof value === 'string' ? value : (value as Record<string, string>).import
    if (!importPath?.match(/\.[cm]?js$/)) continue
    const name = key === '.' ? 'index' : (key as string).replace(/^\.\//, '')
    const srcPath = name === 'index' ? resolve(src, 'index.ts') : resolve(src, name, 'index.ts')

    if (!existsSync(srcPath)) {
      console.warn(`Entry not found: ${srcPath}, skipping`)
      continue
    }

    entries[name] = srcPath
  }

  return entries
}
