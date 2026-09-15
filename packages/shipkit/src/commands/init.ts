import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
export type Target = 'app' | 'library'

const templates: Record<Target, string> = {
  library: `import { mergeConfig } from 'vite'
import base from '@munsonlabs/shipkit/vite/vue.config'

export default mergeConfig(base, {
  // local overrides
})
`,
  app: `import { mergeConfig } from 'vite'
import base from '@munsonlabs/shipkit/vite/vue.config'

export default mergeConfig(base, {
  // local overrides
})
`,
}

export function runInit(target: Target) {
  const dest = resolve(process.cwd(), 'vite.config.ts')

  if (existsSync(dest)) {
    console.error(`vite.config.ts already exists.`)
    process.exit(1)
  }

  writeFileSync(dest, templates[target], 'utf8')
  console.log(`Created vite.config.ts (${target}).`)
}
