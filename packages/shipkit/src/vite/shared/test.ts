import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const setupFile = resolve(process.cwd(), 'tests/setup.ts')
const setupFiles = existsSync(setupFile) ? ['tests/setup.ts'] : []

export const test = {
  environment: 'happy-dom',
  globals: true,
  ...(setupFiles.length ? { setupFiles } : {}),
}
