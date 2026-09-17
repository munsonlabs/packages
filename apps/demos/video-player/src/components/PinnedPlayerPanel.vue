<script setup lang="ts">
import { VideoCard } from '@munsonlabs/video-player'
import type { StateChangeEvent } from '@munsonlabs/video-player'
import { useEventLog } from '../composables/useEventLog'
import { catalogue } from '../data/catalogue'

const { addLog } = useEventLog()
const demoVideo = { ...catalogue.pinned, title: 'Flower' }

function onStateChange(e: StateChangeEvent): void {
  addLog(e)
}
</script>

<template>
  <section class="panel">
    <h2 class="panel__heading"><span class="panel__heading-dot" />Pin When Out of View</h2>
    <p class="panel__description">
      A single inline <code>VideoCard</code> with <code>pin</code> set - no playlist, no <code>VideoStage</code>. Scroll it out of the viewport while
      it's playing and it pins to the corner instead of just auto-pausing. Like a mini-player, pausing it while pinned doesn't dismiss it - it stays
      put in the corner until you scroll back to it or close it with the corner's own close button.
    </p>
    <VideoCard v-bind="demoVideo" :lazy="true" muted pin="bottom-left" :controls="true" @state-change="onStateChange" />
  </section>
</template>
