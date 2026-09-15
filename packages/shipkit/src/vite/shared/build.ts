import { resolve } from 'node:path'
import { readdirSync, existsSync } from 'node:fs'

const rootDir = process.cwd()

function findHtmlFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => resolve(dir, f))
}

const htmlFiles = findHtmlFiles(rootDir)
const input = htmlFiles.length === 1 ? htmlFiles[0] : undefined

export const build = {
  outDir: resolve(rootDir, 'dist'),
  rollupOptions: {
    input,
    output: { chunkFileNames: 'chunks/[name]-[hash].js' },
  },
}
