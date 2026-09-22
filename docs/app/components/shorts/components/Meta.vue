<script setup lang="ts">
import type { PlayerHandle } from '@munsonlabs/video-player'
import type { Short } from '../data/shorts'

defineProps<{ short: Short; handle: PlayerHandle | null }>()
</script>

<template>
  <div class="shorts__meta">
    <div class="shorts__channel">
      <span class="shorts__avatar">{{ short.handle[1].toUpperCase() }}</span>
      <span class="shorts__handle">{{ short.handle }}</span>
      <span v-if="handle?.isLive" class="shorts__live"><span class="shorts__live-dot" />Live</span>
      <button v-else class="shorts__subscribe">Subscribe</button>
    </div>
    <p class="shorts__title">{{ short.title }}</p>
  </div>
</template>

<style scoped>
@import '../styles/meta.css';
</style>
