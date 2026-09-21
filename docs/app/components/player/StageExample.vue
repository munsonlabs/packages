<script setup lang="ts">
import type { Component } from 'vue'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{ caption?: string }>(), { caption: '' })

const playlist = [
  {
    label: 'Big Buck Bunny (HLS)',
    src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    poster: 'https://m.media-amazon.com/images/S/pv-target-images/fb7afef01282cdc2d846b2343f9f3d7a785b7133729776f1aa0da6501a2e1f7b.jpg',
  },
  {
    label: 'Apple bipbop (HLS, captioned)',
    src: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
    poster: 'https://img.youtube.com/vi/aqz-KE-bpKQ/0.jpg',
  },
  {
    label: 'Big Buck Bunny (YouTube)',
    src: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    poster: 'https://img.youtube.com/vi/aqz-KE-bpKQ/0.jpg',
  },
]

const stage = shallowRef<Component | null>(null)
const card = shallowRef<Component | null>(null)
const failed = ref(false)

onMounted(async () => {
  try {
    const mod = await import('@munsonlabs/video-player')
    await import('@munsonlabs/video-player/style')
    stage.value = mod.VideoStage as Component
    card.value = mod.VideoCard as Component
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <figure class="stage-example">
    <ClientOnly>
      <template v-if="stage && card">
        <component :is="stage" :playlist="playlist" pin="bottom-right" />
        <div class="stage-example__grid">
          <component :is="card" v-for="entry in playlist" :key="entry.src" v-bind="entry" muted />
        </div>
      </template>
      <p v-else-if="failed" class="stage-example__status">Could not load <code>@munsonlabs/video-player</code> from the workspace build.</p>
      <p v-else class="stage-example__status">Loading stage…</p>

      <template #fallback>
        <p class="stage-example__status">Loading stage…</p>
      </template>
    </ClientOnly>
    <figcaption v-if="caption" class="stage-example__caption">{{ caption }}</figcaption>
  </figure>
</template>

<style scoped>
.stage-example {
  margin: 1.5rem 0;
}

.stage-example__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.stage-example__status {
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-text-muted);
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius, 8px);
}

.stage-example__caption {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--ui-text-muted);
}
</style>
