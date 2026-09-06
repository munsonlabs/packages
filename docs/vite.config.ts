import { defineConfig } from 'vite-plus'
import { fmt, lint } from '@munsonlabs/shipkit/vite/shared'

export default defineConfig({
  lint,
  fmt,
})
