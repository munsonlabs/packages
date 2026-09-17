<script setup lang="ts">
import { version as workspaceVersion } from '../../../packages/video-player/package.json'

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
    src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    poster: 'https://m.media-amazon.com/images/S/pv-target-images/fb7afef01282cdc2d846b2343f9f3d7a785b7133729776f1aa0da6501a2e1f7b.jpg',
    title: 'Big Buck Bunny',
  },
)

const state = ref<'loading' | 'loaded' | 'error'>('loading')

onMounted(async () => {
  try {
    // Vue's esm-bundler build expects a bundler to define its feature flags; on a CDN nothing does. Vue sets them in createApp(), but VueElement._mount reads __VUE_PROD_DEVTOOLS__ before the app exists, so it must be supplied or every element renders nothing (the ReferenceError is thrown inside connectedCallback, out of reach of the catch below).
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
        :label="props.title"
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
