import { defineConfig } from 'vite-plus'
import { fmt as baseFmt, lint as baseLint } from '@munsonlabs/shipkit/vite/shared'

export default defineConfig({
  fmt: baseFmt,
  lint: baseLint,
  staged: {
    '*': 'vp check --fix',
  },
})
