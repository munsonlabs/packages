<script setup lang="ts">
import type { PlayerHandle } from '@munsonlabs/video-player'
import { useShortsParts } from '../parts'

defineProps<{ handle: PlayerHandle | null; likes: string; comments: string }>()

const { QualityButton, Sigil } = useShortsParts()
</script>

<template>
  <div class="shorts__rail">
    <button class="shorts__action">
      <Sigil name="thumb-up" library="shorts" />
      <span>{{ likes }}</span>
    </button>
    <button class="shorts__action">
      <Sigil name="thumb-down" library="shorts" />
      <span>Dislike</span>
    </button>
    <button class="shorts__action">
      <Sigil name="comment" library="shorts" />
      <span>{{ comments }}</span>
    </button>
    <button class="shorts__action">
      <Sigil name="share" library="shorts" />
      <span>Share</span>
    </button>
    <QualityButton :player="handle" class="shorts__action" v-slot="{ currentLabel }">
      <Sigil name="quality" library="shorts" />
      <span>{{ currentLabel }}</span>
    </QualityButton>
  </div>
</template>

<style scoped>
@import '../styles/rail.css';
</style>
