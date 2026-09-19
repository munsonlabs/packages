<script setup lang="ts">
/**
 * A real VideoCard from the workspace build, plus a button that replaces the player's whole icon set by
 * registering an `mlv` library that resolves each name to a Lucide SVG on jsDelivr - the same call a
 * client's script would make. Unregistering it hands the player its built-in icons back.
 */
import type { Component } from 'vue'

const VideoCard = shallowRef<Component | null>(null)
const failed = ref(false)
const swapped = ref(false)

/** The player's short names → Lucide's, for the few that differ. */
const LUCIDE: Record<string, string> = {
  replay: 'rotate-ccw',
  'volume-on': 'volume-2',
  'volume-mute': 'volume-x',
  'fullscreen-enter': 'maximize',
  'fullscreen-exit': 'minimize',
  quality: 'settings-2',
  loop: 'repeat',
  pip: 'picture-in-picture-2',
  'skip-next': 'skip-forward',
  more: 'ellipsis',
  controls: 'sliders-horizontal',
  close: 'x',
  back: 'arrow-left',
}

onMounted(async () => {
  try {
    const mod = await import('@munsonlabs/video-player')
    await import('@munsonlabs/video-player/style')
    VideoCard.value = mod.VideoCard as Component
  } catch {
    failed.value = true
  }
})

async function toggle() {
  const { register, unregister } = await import('@munsonlabs/sigil')

  if (swapped.value) {
    unregister('mlv')
  } else {
    void register('mlv', {
      resolver: (name) => {
        const short = name.replace('mlv-', '')
        return `https://cdn.jsdelivr.net/npm/lucide-static@1.46.0/icons/${LUCIDE[short] ?? short}.svg`
      },
      mutator: (svg) => {
        svg.removeAttribute('width')
        svg.removeAttribute('height')
      },
    })
  }

  swapped.value = !swapped.value
}
</script>

<template>
  <figure class="icon-video-swap my-5">
    <ClientOnly>
      <component
        :is="VideoCard"
        v-if="VideoCard"
        label="Big Buck Bunny"
        src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
        poster="https://m.media-amazon.com/images/S/pv-target-images/fb7afef01282cdc2d846b2343f9f3d7a785b7133729776f1aa0da6501a2e1f7b.jpg"
        action="mute"
      />
      <p v-else-if="failed" class="icon-video-swap__status">Could not load <code>@munsonlabs/video-player</code> from the workspace build.</p>
      <p v-else class="icon-video-swap__status">Loading player…</p>
      <template #fallback>
        <p class="icon-video-swap__status">Loading player…</p>
      </template>
    </ClientOnly>
    <UButton block size="sm" color="neutral" variant="outline" class="icon-video-swap__toggle mt-3" @click="toggle">
      {{ swapped ? 'Revert' : 'Use Lucide' }}
    </UButton>
  </figure>
</template>

<style scoped>
.icon-video-swap {
  margin: 1.25rem 0;
}
.icon-video-swap__status {
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border-muted);
  border-radius: var(--ui-radius, 8px);
}
</style>
