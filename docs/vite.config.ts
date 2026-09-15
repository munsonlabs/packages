import { defineConfig } from 'vite-plus'
import { fmt, lint } from '@munsonlabs/shipkit/vite/shared'

export default defineConfig({
  lint,
  fmt,
  run: {
    tasks: {
      // The docs render live examples against @munsonlabs/video-player's dist build (see
      // app/components/PlayerExample.vue), so on a clean checkout there is nothing to resolve
      // without this. CI builds apps/demos before the docs, and their tasks already depend on
      // this build - which made the ordering work by accident. Declared here so it doesn't.
      dev: {
        command: 'nuxt dev',
        dependsOn: ['@munsonlabs/video-player#build'],
      },
      build: {
        command: 'nuxt build',
        dependsOn: ['@munsonlabs/video-player#build'],
      },
      generate: {
        command: 'nuxt generate',
        dependsOn: ['@munsonlabs/video-player#build'],
        // Both are baked into the generated output (base path, canonical URLs), so they have to
        // be fingerprinted - otherwise a cached root-relative build gets restored over a
        // sub-path one, the same trap apps/demos/video-player documents for VITE_BASE_*.
        env: ['NUXT_APP_BASE_URL', 'NUXT_SITE_URL'],
      },
    },
  },
})
