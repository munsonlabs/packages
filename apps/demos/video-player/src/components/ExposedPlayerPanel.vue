<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { VideoPlayer, exposePlayerOnElement } from '@munsonlabs/video-player'
import type { StateChangeEvent, TranscriptCue, VideoEntry } from '@munsonlabs/video-player'
import { useEventLog } from '../composables/useEventLog'

const DEFAULT_VIDEO: VideoEntry = {
  label: 'Big Buck Bunny — exposed to a third-party control',
  src: 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4',
  poster: 'https://img.youtube.com/vi/aqz-KE-bpKQ/0.jpg',
}

const DEFAULT_CUES: TranscriptCue[] = [
  { time: 0, text: 'Opening titles - birds sing over a peaceful meadow.' },
  { time: 30, text: 'Big Buck the giant rabbit wakes up in his burrow.' },
  { time: 60, text: 'He steps out into the sunshine and stretches.' },
  { time: 95, end: 110, text: 'He stops to smell a flower - a butterfly lands on his nose.' },
  { time: 145, text: 'The three rodents show up to spoil the morning.' },
  { time: 210, text: 'Frank flattens the butterfly. This means war.' },
  { time: 330, text: 'Trap construction montage - vines, logs, sharpened sticks.' },
  { time: 425, text: 'The rodents walk straight into the gauntlet, one by one.' },
  { time: 555, text: 'Peace returns to the meadow.' },
]

const props = defineProps<{ video?: VideoEntry; cues?: TranscriptCue[] }>()
const video = computed(() => props.video ?? DEFAULT_VIDEO)
const cues = computed(() => props.cues ?? DEFAULT_CUES)

const { addLog } = useEventLog()

const playerRef = ref<InstanceType<typeof VideoPlayer> | null>(null)
const wrapperEl = ref<HTMLElement | null>(null)
const transcriptSlot = ref<HTMLElement | null>(null)

onMounted(() => {
  exposePlayerOnElement(wrapperEl.value!, playerRef.value)

  const transcript = document.createElement('ml-controls-transcript')
  transcript.setAttribute('for', 'exposed-player')
  ;(transcript as unknown as { cues: unknown }).cues = cues.value
  transcriptSlot.value?.appendChild(transcript)
})

function onStateChange(e: StateChangeEvent): void {
  addLog(e)
}
</script>

<template>
  <section class="panel">
    <h2 class="panel__heading"><span class="panel__heading-dot" />Exposing a Vue Player to a Third-Party Control</h2>
    <p class="panel__description">
      The player below is a plain Vue <code>&lt;VideoPlayer&gt;</code> - not a custom element. The transcript next to it is a genuine
      <code>&lt;ml-controls-transcript&gt;</code> web component, created with plain DOM APIs (standing in for a real third party's own independent
      script) and pointed at the player purely via <code>for="exposed-player"</code> - it has no Vue-specific wiring at all, and would work
      identically dropped into a page with no Vue on it whatsoever. That only works because of one call to <code>exposePlayerOnElement()</code> in
      this panel's <code>onMounted</code>, which copies the Vue player's exposed state/methods onto the wrapper <code>div</code> below - without it,
      <code>for</code> would find the div but nothing on it would respond.
    </p>

    <div class="exposed-player__layout">
      <div id="exposed-player" ref="wrapperEl" class="video-card exposed-player__video">
        <VideoPlayer ref="playerRef" v-bind="video" @state-change="onStateChange" />
      </div>
      <div ref="transcriptSlot" class="exposed-player__list"></div>
    </div>
  </section>
</template>

<style scoped>
.exposed-player__layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
  max-width: 1000px;
  margin: 0 auto;
}

.exposed-player__list {
  max-height: 320px;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-dim);
}

@media (max-width: 720px) {
  .exposed-player__layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .exposed-player__list {
    max-height: 220px;
  }
}
</style>
