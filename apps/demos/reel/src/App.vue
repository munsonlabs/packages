<script setup lang="ts">
import { VideoPlayer } from '@munsonlabs/video-player'

/**
 * This demo's own files, served from its public/ folder.
 */
const media = (name: string) => new URL(`${import.meta.env.BASE_URL}media/${name}`, location.href).href
const src = media('count-720p.mp4')
</script>

<template>
  <article class="article">
    <p class="kicker">Reel demo · Experimental</p>
    <h1>The clock that never stops</h1>
    <p class="standfirst">Twelve seconds of a drawn clock, a sweeping marker and a rising tone. Soon you will be able to clip it.</p>

    <VideoPlayer :src="src" label="The clock that never stops" />

    <h2>How it works</h2>
    <p>The player is <code>@munsonlabs/video-player</code>. Reel, the package that will cut clips from it, is a skeleton for now.</p>
  </article>
</template>

<style>
:root {
  color-scheme: light;
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
  background: #f6f4ee;
  color: #1f2328;
  --ml-video-accent: #2e9460;
}

body {
  margin: 0;
}

.article {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 20px 120px;
  line-height: 1.6;
}

.kicker {
  margin: 0;
  color: #2e9460;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 0.8rem;
}

h1 {
  margin: 0.2em 0 0.3em;
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.1;
}

.standfirst {
  font-size: 1.15rem;
  color: #4b5560;
}

.source {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-weight: 600;
}

.source select {
  font: inherit;
  font-weight: 400;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #cfc9b8;
  background: #fff;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 16px 0 32px;
}

.clip {
  font: inherit;
  font-weight: 600;
  padding: 10px 18px;
  border: 0;
  border-radius: 10px;
  background: #e2a32e;
  color: #1b1405;
  cursor: pointer;
}

.clip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.note {
  color: #6b7480;
  font-size: 0.9rem;
}

.result video {
  max-height: 420px;
  border-radius: 10px;
  background: #000;
}

code {
  font-size: 0.9em;
  background: #ece8dc;
  padding: 0.1em 0.3em;
  border-radius: 4px;
}
</style>
