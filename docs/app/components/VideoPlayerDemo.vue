<script setup lang="ts">
import { version as workspaceVersion } from '../../../packages/video-player/package.json'

/**
 * Loads @munsonlabs/video-player's actual published web component bundle from a CDN
 * (not a local import) so this demo runs the real npm-published package, not source code.
 * The element bundle links its own dist/style.css automatically once imported - no separate
 * CSS step needed here.
 *
 * The default version is the workspace package's own. Outside a release that is exactly
 * what is on npm, since `changeset version` only bumps it when the Version Packages PR
 * merges - and the release workflow redeploys the site after publishing, so the page is
 * never built against a version the CDN does not have yet.
 */
const props = withDefaults(
  defineProps<{
    version?: string
    src?: string
    poster?: string
    title?: string
    adTagUrl?: string
  }>(),
  {
    version: workspaceVersion,
    // The commonly-used GCS sample poster (storage.googleapis.com/gtv-videos-bucket/...) now
    // 403s, so this deliberately omits `poster` - VideoPlaceholder falls back to a plain
    // play-button placeholder rather than showing a broken image on a live-rendered demo.
    src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    poster:
      'https://upload.wikimedia.org/wikipedia/commons/7/70/Big.Buck.Bunny.-.Opening.Screen.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original',
    title: 'Big Buck Bunny',
  },
)

const state = ref<'loading' | 'loaded' | 'error'>('loading')

onMounted(async () => {
  try {
    // Vue's esm-bundler build expects its compile-time feature flags to be substituted by a
    // bundler, and nothing does that on a CDN. Vue defines them itself in initFeatureFlags(),
    // but that runs inside createApp() — and VueElement._mount reads __VUE_PROD_DEVTOOLS__ on
    // its first line, before the app exists, so this one has to be supplied. Vue fills in
    // __VUE_OPTIONS_API__ and __VUE_PROD_HYDRATION_MISMATCH_DETAILS__ once the app is created.
    //
    // Without it every element registers, lands in the DOM, and renders nothing: the
    // ReferenceError is thrown inside connectedCallback, where the catch below cannot see it.
    globalThis.__VUE_PROD_DEVTOOLS__ = false

    await import(/* @vite-ignore */ `https://esm.sh/@munsonlabs/video-player@${props.version}/element`)
    state.value = 'loaded'
  } catch {
    state.value = 'error'
  }
})
</script>

<template>
  <ClientOnly>
    <div class="video-player-demo">
      <ml-video-card
        v-if="state === 'loaded'"
        :src="props.src"
        :lazy="false"
        :action="'mute'"
        :poster="props.poster"
        :title="props.title"
        :ad-tag-url="props.adTagUrl"
      />
      <p v-else-if="state === 'error'" class="video-player-demo__status">Could not load <code>@munsonlabs/video-player</code> from unpkg.</p>
      <p v-else class="video-player-demo__status">Loading player from npm…</p>
    </div>
    <p class="video-player-demo__caption">
      Live demo — loaded from
      <a :href="`https://www.npmjs.com/package/@munsonlabs/video-player/v/${props.version}`" target="_blank" rel="noopener">
        @munsonlabs/video-player@{{ props.version }}
      </a>
      via unpkg, not from this repo's source.
    </p>
    <template #fallback>
      <p class="video-player-demo__status">Loading player from npm…</p>
    </template>
  </ClientOnly>
</template>

<style scoped>
.video-player-demo {
  margin: 1.5rem 0 0.5rem;
}

.video-player-demo__status {
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-text-muted);
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius, 8px);
}

.video-player-demo__caption {
  margin: 0.5rem 0 1.5rem;
  font-size: 0.8rem;
  color: var(--ui-text-muted);
}
</style>
