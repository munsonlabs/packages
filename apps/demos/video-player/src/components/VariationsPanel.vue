<script setup lang="ts">
import { VideoCard } from '@munsonlabs/video-player'
import type { StateChangeEvent } from '@munsonlabs/video-player'
import { variations } from '../data/catalogue'
import { useEventLog } from '../composables/useEventLog'

const { addLog } = useEventLog()

function onStateChange(e: StateChangeEvent): void {
  addLog(e)
}
</script>

<template>
  <section class="panel">
    <h2 class="panel__heading"><span class="panel__heading-dot" />Variations</h2>
    <p class="panel__description">
      Every <code>VideoCard</code> prop variation on the same local clip - the browser test suite mounts these exact entries from
      <code>src/data/catalogue.ts</code>.
    </p>
    <div class="playlist__grid">
      <div v-for="video in variations" :key="video.src" class="video-card variation" :data-variation="video.label">
        <VideoCard v-bind="video" @state-change="onStateChange" />
        <p class="variation__label">{{ video.label }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.variation__label {
  padding: 0.5rem 0.75rem;
  color: var(--text-dim);
  font-size: 0.8rem;
}
</style>
