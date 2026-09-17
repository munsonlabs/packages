<script setup lang="ts">
import { ref } from 'vue'
import { VideoPlayer } from '@munsonlabs/video-player'
import type { PlayerHandle, StateChangeEvent } from '@munsonlabs/video-player'
import { useDemoSettings } from '../composables/useDemoSettings'
import { useEventLog } from '../composables/useEventLog'

const video = {
  title: 'HLS test stream (bipbop) — custom controls',
  src: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
  poster: 'https://img.youtube.com/vi/aqz-KE-bpKQ/0.jpg',
}

const { webComponents } = useDemoSettings()
const { addLog } = useEventLog()

const itemRef = ref<PlayerHandle | null>(null)

function seekBy(deltaSeconds: number): void {
  const current = itemRef.value?.current ?? 0
  const total = itemRef.value?.total ?? 0
  if (!total) return
  const targetSeconds = Math.min(Math.max(current + deltaSeconds, 0), total)
  itemRef.value?.seek((targetSeconds / total) * 100)
}

function onStateChange(e: StateChangeEvent | CustomEvent): void {
  addLog(e instanceof CustomEvent ? e.detail[0] : e)
}
</script>

<template>
  <section class="panel">
    <h2 class="panel__heading"><span class="panel__heading-dot" />Custom Controls</h2>
    <p class="panel__description">
      <code>:controls="false"</code> hides the player's own HUD entirely - the buttons below drive playback through the same imperative API a template
      ref exposes (<code>togglePlay()</code>, <code>seek()</code>, <code>toggleMute()</code>, and reactive state like <code>isPlaying</code>).
    </p>

    <div class="video-card custom-controls__card">
      <component :is="webComponents ? 'ml-video-player' : VideoPlayer" ref="itemRef" v-bind="video" @state-change="onStateChange" />
    </div>

    <div class="custom-controls__buttons">
      <button class="custom-controls__btn" @click="itemRef?.togglePlay()">{{ itemRef?.isPlaying ? 'Pause' : 'Play' }}</button>
      <button class="custom-controls__btn" @click="seekBy(-10)">« 10s</button>
      <button class="custom-controls__btn" @click="seekBy(10)">10s »</button>
      <button class="custom-controls__btn" @click="itemRef?.toggleMute()">{{ itemRef?.isMuted ? 'Unmute' : 'Mute' }}</button>
    </div>
  </section>
</template>

<style scoped>
.custom-controls__card {
  max-width: 800px;
  margin: 0 auto;
}

.custom-controls__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: center;
  margin-top: 1.25rem;
}

.custom-controls__btn {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.55rem 1.2rem;
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.custom-controls__btn:hover {
  border-color: var(--border-strong);
  background: var(--surface-hover);
}
</style>
