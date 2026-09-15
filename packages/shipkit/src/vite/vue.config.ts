// shipkit: vue
import { defineConfig } from 'vite-plus'
import { resolve } from 'node:path'
import { getFormattedVersion } from '../utils/version.ts'
import { getPackageBase } from '../utils/package.ts'
import * as base from './vue/index.ts'

import type { UserConfig } from 'vite-plus'

const gitVersion = getFormattedVersion()

export default defineConfig({
  ...base,
  base: getPackageBase(),
  define: {
    'import.meta.env.VITE_GIT_VERSION': JSON.stringify(gitVersion),
  },
  resolve: {
    alias: {
      '@': resolve(process.cwd(), 'src'),
      '@test': resolve(process.cwd(), 'test'),
    },
  },
} as unknown as UserConfig)
