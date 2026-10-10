import { defineConfig } from 'vite-plus'
import { fmt as baseFmt, lint as baseLint } from '@munsonlabs/shipkit/vite/shared'

export default defineConfig({
  fmt: baseFmt,
  lint: {
    ...baseLint,
    overrides: [
      {
        // The loom packages and demos are plain JavaScript. Type-aware rules read their JSDoc type names
        // as unresolved, and their typedef-only files are all comments.
        files: ['packages/loom/**', 'packages/loom-studio/**', 'apps/demos/{loom-studio,loom-feed,timeline-kit,bolt-bridge-stub,loom-steps}/**'],
        rules: {
          'typescript/no-redundant-type-constituents': 'off',
          'typescript/require-array-sort-compare': 'off',
          'typescript/no-misused-spread': 'off',
          'unicorn/no-empty-file': 'off',
        },
      },
    ],
  },
  staged: {
    '*': 'vp check --fix',
  },
})
