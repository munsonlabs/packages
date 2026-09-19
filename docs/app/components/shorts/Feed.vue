<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, type Component } from 'vue'
import Slide from './slide/Slide.vue'
import { SHORTS } from './data/shorts'
import { CHEVRON_DOWN, CHEVRON_UP, FULLSCREEN_ENTER, FULLSCREEN_EXIT } from './icons'
import { useRecycler } from './composables/useRecycler'

const parts = shallowRef<Record<string, Component> | null>(null)
const failed = ref(false)
const scroller = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)

const { slots, index, onScroll, go } = useRecycler(scroller, SHORTS)

onMounted(async () => {
  try {
    const m = await import('@munsonlabs/video-player')
    await import('@munsonlabs/video-player/style')
    parts.value = {
      VideoCard: m.VideoCard,
      PlayButton: m.PlayButton,
      MuteButton: m.MuteButton,
      Scrubber: m.Scrubber,
      Buffering: m.Buffering,
    }
  } catch {
    failed.value = true
  }

  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

function onFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === stage.value
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    stage.value?.requestFullscreen()
  }
}
</script>

<template>
  <ClientOnly>
    <div class="shorts">
      <p v-if="failed" class="shorts__status">Could not load <code>@munsonlabs/video-player</code>.</p>

      <div v-else-if="parts" ref="stage" class="shorts__stage">
        <div ref="scroller" class="shorts__scroller" @scroll.passive="onScroll">
          <div v-for="(short, slot) in slots" :key="short?.id ?? `empty-${slot}`" class="shorts__slide">
            <Slide v-if="short" :short="short" :parts="parts" />
          </div>
        </div>

        <div class="shorts__nav">
          <button class="shorts__navbtn" :disabled="index === 0" aria-label="Previous short" @click="go(-1)">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path :d="CHEVRON_UP" /></svg>
          </button>
          <button class="shorts__navbtn" :disabled="index === SHORTS.length - 1" aria-label="Next short" @click="go(1)">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path :d="CHEVRON_DOWN" /></svg>
          </button>
          <button class="shorts__navbtn" :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'" @click="toggleFullscreen">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path :d="isFullscreen ? FULLSCREEN_EXIT : FULLSCREEN_ENTER" />
            </svg>
          </button>
        </div>
      </div>

      <p v-else class="shorts__status">Loading the feed…</p>
    </div>

    <template #fallback>
      <p class="shorts__status">Loading the feed…</p>
    </template>
  </ClientOnly>
</template>

<style scoped>
@import './feed.css';
</style>
