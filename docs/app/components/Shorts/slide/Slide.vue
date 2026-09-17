<script setup lang="ts">
import { ref, type Component } from 'vue'
import Rail from '../rail/Rail.vue'
import type { Short } from '../data/shorts'
import { AUDIBLE, MUTED, PLAY } from '../icons'
import type { PlayerHandle } from '@munsonlabs/video-player'

defineProps<{ short: Short; parts: Record<string, Component> }>()

const handle = ref<PlayerHandle | null>(null)

function setHandle(el: unknown): void {
  handle.value = el as PlayerHandle | null
}

/** `tap` fires from the tap-to-reveal overlay even with controls={false}. */
function onState(e: { type?: string } | CustomEvent): void {
  const detail = e instanceof CustomEvent ? e.detail?.[0] : e
  if (detail?.type === 'tap') handle.value?.togglePlay()
}
</script>

<template>
  <div class="shorts__frame">
    <component
      :is="parts.VideoCard"
      :ref="setHandle"
      :src="short.src"
      :poster="short.poster"
      :title="short.title"
      :lazy="false"
      loop
      preload="auto"
      aspect-ratio="9:16"
      :controls="false"
      play-in-view
      @state-change="onState"
    />

    <component :is="parts.Buffering" :player="handle" class="shorts__spinner">
      <span class="shorts__spinner-ring" />
    </component>

    <!-- Only shows once the viewer has paused: before the first play the poster stands alone rather than a play icon over a video that's about to autoplay. The empty <span> matters: a v-if that renders nothing leaves a comment, which counts as an empty slot, and PlayButton falls back to its own play/pause icon. -->
    <component :is="parts.PlayButton" :player="handle" class="shorts__bigplay" v-slot="{ isPlaying }">
      <svg v-if="handle?.hasStarted && !isPlaying" viewBox="0 0 24 24" fill="currentColor" width="34" height="34"><path :d="PLAY" /></svg>
      <span v-else />
    </component>

    <component :is="parts.MuteButton" :player="handle" class="shorts__mute" v-slot="{ isMuted }">
      <svg v-if="isMuted" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path :d="MUTED[0]" opacity=".35" />
        <path :d="MUTED[1]" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path :d="AUDIBLE" /></svg>
    </component>

    <div class="shorts__meta">
      <div class="shorts__channel">
        <span class="shorts__avatar">{{ short.handle[1].toUpperCase() }}</span>
        <span class="shorts__handle">{{ short.handle }}</span>
        <button class="shorts__subscribe">Subscribe</button>
      </div>
      <p class="shorts__title">{{ short.title }}</p>
    </div>

    <!-- No class: Scrubber sets inheritAttrs:false, so anything passed here lands on its inner input, past this component's scope attribute. Styled through :deep() instead. -->
    <component :is="parts.Scrubber" :player="handle" />
  </div>

  <Rail :likes="short.likes" :comments="short.comments" />
</template>

<style scoped>
@import './slide.css';
</style>
