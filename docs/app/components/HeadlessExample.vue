<script setup lang="ts">
/**
 * A live `controls="false"` player driven entirely by the headless control primitives, plus a
 * Transcript - the two claims on the extensibility and controls pages that a static code block
 * can't actually show working.
 *
 * Everything is loaded dynamically inside onMounted for the same reason as PlayerExample: the
 * docs are prerendered by `nuxt generate`, and the player is browser-only.
 */
import type { Component } from 'vue'

const player = ref(null)
const parts = shallowRef<Record<string, Component> | null>(null)
const failed = ref(false)

const cues = [
  { time: 0, text: 'Opening titles - birds sing over a peaceful meadow.' },
  { time: 33, text: 'Big Buck Bunny steps out of his burrow and stretches.' },
  { time: 95, end: 110, text: 'He stops to smell a flower - a butterfly lands on his nose.' },
  { time: 150, text: 'The rodents begin their ambush.' },
]

onMounted(async () => {
  try {
    const m = await import('@munsonlabs/video-player')
    await import('@munsonlabs/video-player/style')
    parts.value = {
      VideoPlayer: m.VideoPlayer,
      PlayButton: m.PlayButton,
      MuteButton: m.MuteButton,
      Scrubber: m.Scrubber,
      TimeDisplay: m.TimeDisplay,
      Transcript: m.Transcript,
    }
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <figure class="headless-example">
    <ClientOnly>
      <template v-if="parts">
        <component
          :is="parts.VideoPlayer"
          ref="player"
          src="https://cdn.jwplayer.com/videos/O5chtspP-4VHSaSK0.mp4"
          title="Big Buck Bunny"
          :controls="false"
        />

        <div class="headless-example__bar">
          <component :is="parts.PlayButton" :player="player" />
          <component :is="parts.MuteButton" :player="player" />
          <component :is="parts.Scrubber" :player="player" class="headless-example__scrubber" />
          <component :is="parts.TimeDisplay" :player="player" />
        </div>

        <component :is="parts.Transcript" :player="player" :cues="cues" class="headless-example__transcript" />
      </template>

      <p v-else-if="failed" class="headless-example__status">Could not load <code>@munsonlabs/video-player</code> from the workspace build.</p>
      <p v-else class="headless-example__status">Loading player…</p>

      <template #fallback>
        <p class="headless-example__status">Loading player…</p>
      </template>
    </ClientOnly>
    <figcaption class="headless-example__caption">
      No built-in HUD - the bar and transcript below are the headless primitives, wired to the player by ref. Click a transcript line to seek.
    </figcaption>
  </figure>
</template>

<style scoped>
.headless-example {
  margin: 1.5rem 0;
}

.headless-example__bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius, 8px);
}

.headless-example__scrubber {
  flex: 1;
  min-width: 0;
}

.headless-example__transcript {
  max-height: 11rem;
  overflow-y: auto;
  margin-top: 0.5rem;
  padding: 0.5rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius, 8px);
}

.headless-example__status {
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-text-muted);
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius, 8px);
}

.headless-example__caption {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--ui-text-muted);
}
</style>
