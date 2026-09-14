<script setup lang="ts">
/**
 * Loads @munsonlabs/video-player's actual published web component bundle from unpkg
 * (not a local import) so this demo runs the real npm-published package, not source code.
 * The element bundle links its own dist/style.css automatically once imported - no separate
 * CSS step needed here. Vue is an external dependency; see nuxt.config.ts for the import map
 * this needs (matches the package README's own documented web-component usage).
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
    version: '0.2.2',
    // The commonly-used GCS sample poster (storage.googleapis.com/gtv-videos-bucket/...) now
    // 403s, so this deliberately omits `poster` - VideoPlaceholder falls back to a plain
    // play-button placeholder rather than showing a broken image on a live-rendered demo.
    src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Big.Buck.Bunny.-.Opening.Screen.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original',
    title: 'Big Buck Bunny',
  },
)

const state = ref<'loading' | 'loaded' | 'error'>('loading')

onMounted(async () => {
  try {
    // `?external=vue` is load-bearing. Without it esm.sh resolves Vue itself, to the ESM
    // *bundler* build, whose compile-time flags nothing substitutes on a CDN — the first
    // `connectedCallback` then dies with `ReferenceError: __VUE_PROD_DEVTOOLS__ is not
    // defined` and the element sits in the DOM registered and empty. With it, the bundle
    // imports bare `vue` and the import map in nuxt.config resolves that to a browser
    // build with the flags already baked in.
    await import(/* @vite-ignore */ `https://esm.sh/@munsonlabs/video-player@${props.version}/element?external=vue`)
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
      <p v-else-if="state === 'error'" class="video-player-demo__status">
        Could not load <code>@munsonlabs/video-player</code> from unpkg.
      </p>
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
