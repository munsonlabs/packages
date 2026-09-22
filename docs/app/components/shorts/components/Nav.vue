<script setup lang="ts">
import { toRef } from 'vue'
import { useFullscreen } from '../composables/useFullscreen'
import { lucideIcons, toggleIconSet } from '../icons'
import { useShortsParts } from '../parts'

const props = defineProps<{ stage: HTMLElement | null; index: number; count: number }>()

const { Sigil } = useShortsParts()
const emit = defineEmits<{ go: [delta: number]; refresh: [] }>()

const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(toRef(props, 'stage'))
</script>

<template>
  <div class="shorts__nav">
    <button class="shorts__navbtn" :disabled="index === 0" aria-label="Previous short" @click="emit('go', -1)">
      <Sigil name="chevron-up" library="shorts" />
    </button>
    <button class="shorts__navbtn" :disabled="index === count - 1" aria-label="Next short" @click="emit('go', 1)">
      <Sigil name="chevron-down" library="shorts" />
    </button>
    <button class="shorts__navbtn" aria-label="Refresh the feed" @click="emit('refresh')">
      <Sigil name="refresh" library="shorts" />
    </button>
    <button class="shorts__navbtn" :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'" @click="toggleFullscreen">
      <Sigil :name="isFullscreen ? 'fullscreen-exit' : 'fullscreen-enter'" library="shorts" />
    </button>
    <button class="shorts__navbtn" :aria-label="lucideIcons ? 'Use the default icons' : 'Use Lucide icons'" @click="toggleIconSet">
      <Sigil name="palette" library="shorts" />
    </button>
  </div>
</template>

<style scoped>
@import '../styles/nav.css';
</style>
