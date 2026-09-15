<script setup lang="ts">
import { COMMENT, MORE, SHARE, THUMB } from '../icons'

defineProps<{ likes: string; comments: string }>()
</script>

<template>
  <div class="shorts__rail">
    <button class="shorts__action">
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path :d="THUMB" /></svg>
      <span>{{ likes }}</span>
    </button>
    <button class="shorts__action">
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" style="transform: rotate(180deg)"><path :d="THUMB" /></svg>
      <span>Dislike</span>
    </button>
    <button class="shorts__action">
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path :d="COMMENT" /></svg>
      <span>{{ comments }}</span>
    </button>
    <button class="shorts__action">
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path :d="SHARE" /></svg>
      <span>Share</span>
    </button>
    <button class="shorts__action shorts__action--more">
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path :d="MORE" /></svg>
    </button>
  </div>
</template>

<style scoped>
@import './rail.css';
</style>
