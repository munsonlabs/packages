<script setup lang="ts">
import { toRef, type Component } from 'vue'
import { useFullscreen } from '../composables/useFullscreen'
import { lucideIcons, toggleIconSet } from '../icons'

const props = defineProps<{ parts: Record<string, Component>; stage: HTMLElement | null; index: number; count: number }>()
const emit = defineEmits<{ go: [delta: number]; refresh: [] }>()

const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(toRef(props, 'stage'))
</script>

<template>
  <div class="shorts__nav">
    <button class="shorts__navbtn" :disabled="index === 0" aria-label="Previous short" @click="emit('go', -1)">
      <component :is="parts.Sigil" name="chevron-up" library="shorts" />
    </button>
    <button class="shorts__navbtn" :disabled="index === count - 1" aria-label="Next short" @click="emit('go', 1)">
      <component :is="parts.Sigil" name="chevron-down" library="shorts" />
    </button>
    <button class="shorts__navbtn" aria-label="Refresh the feed" @click="emit('refresh')">
      <component :is="parts.Sigil" name="refresh" library="shorts" />
    </button>
    <button class="shorts__navbtn" :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'" @click="toggleFullscreen">
      <component :is="parts.Sigil" :name="isFullscreen ? 'fullscreen-exit' : 'fullscreen-enter'" library="shorts" />
    </button>
    <button class="shorts__navbtn" :aria-label="lucideIcons ? 'Use the default icons' : 'Use Lucide icons'" @click="toggleIconSet">
      <component :is="parts.Sigil" name="palette" library="shorts" />
    </button>
  </div>
</template>

<style scoped>
@import '../styles/nav.css';
</style>
