<script setup>
import { ref } from 'vue'
import { VideoPlayer } from '@munsonlabs/video-player'

const tracks = [
  { src: '/captions/bbb-en.vtt', kind: 'captions', srclang: 'en', label: 'English', default: true },
  { src: '/captions/bbb-fr.vtt', kind: 'captions', srclang: 'fr', label: 'Français' },
]

const events = ref([])

function onStateChange(e) {
  if (e.type === 'timeupdate') return
  events.value = [e.type, ...events.value].slice(0, 8)
}
</script>

<template>
  <main>
    <h1>@munsonlabs/video-player</h1>
    <p>An HLS stream with English and French captions. Edit <code>src/App.vue</code> to try your own source.</p>

    <VideoPlayer
      src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      label="Big Buck Bunny"
      poster="https://img.youtube.com/vi/aqz-KE-bpKQ/0.jpg"
      :tracks="tracks"
      @state-change="onStateChange"
    />

    <ol class="events">
      <li v-for="(type, i) in events" :key="i">{{ type }}</li>
    </ol>
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0b0d12;
  color: #e2e8f0;
}

main {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

h1 {
  font-size: 1.25rem;
}

p {
  color: #94a3b8;
}

.events {
  margin-top: 1rem;
  color: #94a3b8;
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
}
</style>
