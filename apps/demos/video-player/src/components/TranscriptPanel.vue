<script setup lang="ts">
import { computed, ref } from 'vue'
import { VideoPlayer, Transcript } from '@munsonlabs/video-player'
import type { PlayerHandle, StateChangeEvent, TranscriptCue, VideoEntry } from '@munsonlabs/video-player'
import { useDemoSettings } from '../composables/useDemoSettings'
import { useEventLog } from '../composables/useEventLog'

const DEFAULT_VIDEO: VideoEntry = {
  label: 'Big Buck Bunny — transcript',
  src: 'https://cdn.jwplayer.com/videos/O5chtspP-4VHSaSK0.mp4',
  poster: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
}

const DEFAULT_CUES: TranscriptCue[] = [
  { time: 0, text: 'Opening titles - birds sing over a peaceful meadow.' },
  { time: 30, text: 'Big Buck the giant rabbit wakes up in his burrow.' },
  { time: 60, text: 'He steps out into the sunshine and stretches.' },
  { time: 95, end: 110, text: 'He stops to smell a flower - a butterfly lands on his nose.' },
  { time: 145, text: 'The three rodents show up to spoil the morning.' },
  { time: 210, text: 'Frank flattens the butterfly. This means war.' },
  { time: 260, text: 'Buck sizes up the gang and starts planning his revenge.' },
  { time: 330, text: 'Trap construction montage - vines, logs, sharpened sticks.' },
  { time: 425, text: 'The rodents walk straight into the gauntlet, one by one.' },
  { time: 490, end: 540, text: 'Gamera gets the flying-squirrel treatment.' },
  { time: 555, text: 'Peace returns to the meadow.' },
  { time: 571, text: 'End credits.' },
]

const props = defineProps<{ video?: VideoEntry; cues?: TranscriptCue[] }>()
const video = computed(() => props.video ?? DEFAULT_VIDEO)
const cues = computed(() => props.cues ?? DEFAULT_CUES)

const { webComponents } = useDemoSettings()
const { addLog } = useEventLog()

const itemRef = ref<PlayerHandle | null>(null)

function onStateChange(e: StateChangeEvent | CustomEvent): void {
  addLog(e instanceof CustomEvent ? e.detail[0] : e)
}
</script>

<template>
  <section class="panel">
    <h2 class="panel__heading"><span class="panel__heading-dot" />Transcript</h2>
    <p class="panel__description">
      A <code>Transcript</code> control pointed at the player via the same ref every headless control takes: clicking a cue seeks to its timestamp
      (and starts playback if paused), the cue under the playhead is highlighted and kept scrolled into view - except while your pointer is over the
      list, so it never fights your own scrolling. Two cues set <code>end</code>, so nothing is highlighted in the gap after them. Works on embeds
      too, since it only needs the current time and <code>seek()</code>.
    </p>

    <div class="transcript-panel__layout">
      <div class="video-card transcript-panel__video">
        <component :is="webComponents ? 'ml-video-player' : VideoPlayer" ref="itemRef" v-bind="video" @state-change="onStateChange" />
      </div>
      <div class="transcript-panel__list">
        <component :is="webComponents ? 'ml-controls-transcript' : Transcript" :player="itemRef" :cues="cues" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.transcript-panel__layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
  max-width: 1000px;
  margin: 0 auto;
}

.transcript-panel__list {
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
  .transcript-panel__layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .transcript-panel__list {
    max-height: 220px;
  }
}
</style>
