<script setup lang="ts">
import type { Component } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    is?: 'VideoCard' | 'VideoPlayer'
    caption?: string
  }>(),
  { is: 'VideoCard', caption: '' },
)

const attrs = useAttrs()
const resolved = shallowRef<Component | null>(null)
const failed = ref(false)

onMounted(async () => {
  try {
    const mod = await import('@munsonlabs/video-player')
    await import('@munsonlabs/video-player/style')
    resolved.value = mod[props.is] as Component
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <figure class="player-example">
    <ClientOnly>
      <component :is="resolved" v-if="resolved" v-bind="attrs" />
      <p v-else-if="failed" class="player-example__status">Could not load <code>@munsonlabs/video-player</code> from the workspace build.</p>
      <p v-else class="player-example__status">Loading player…</p>

      <template #fallback>
        <p class="player-example__status">Loading player…</p>
      </template>
    </ClientOnly>
    <figcaption v-if="caption" class="player-example__caption">{{ caption }}</figcaption>
  </figure>
</template>

<style scoped>
.player-example {
  margin: 1.5rem 0;
}

.player-example__status {
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-text-muted);
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius, 8px);
}

.player-example__caption {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--ui-text-muted);
}
</style>
