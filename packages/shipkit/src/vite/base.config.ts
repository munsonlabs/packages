// shipkit: base
import { defineConfig } from 'vite-plus'
import { resolve } from 'node:path'
import { getFormattedVersion } from '../utils/version.ts'
import { getPackageBase } from '../utils/package.ts'
import { getLibEntries } from '../utils/entries.ts'
import { build, fmt, lint, test } from './shared/index.ts'
import type { UserConfig } from 'vite-plus'

const gitVersion = getFormattedVersion()

export default defineConfig({
  base: getPackageBase(),
  define: {
    'import.meta.env.VITE_GIT_VERSION': JSON.stringify(gitVersion),
  },
  resolve: {
    alias: {
      '@': resolve(process.cwd(), 'src'),
    },
  },
  pack: {
    dts: true,
    entry: getLibEntries(),
    format: ['es' as const],
    deps: {
      neverBundle: ['vue'],
    },
  },
  build,
  lint,
  fmt,
  test,
}) as UserConfig
