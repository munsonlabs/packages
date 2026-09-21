<script setup lang="ts">
import type { Component } from 'vue'
import type { PlayerHandle } from '@munsonlabs/video-player'

defineProps<{ parts: Record<string, Component>; handle: PlayerHandle | null; likes: string; comments: string }>()
</script>

<template>
  <div class="shorts__rail">
    <button class="shorts__action">
      <component :is="parts.Sigil" name="thumb-up" library="shorts" />
      <span>{{ likes }}</span>
    </button>
    <button class="shorts__action">
      <component :is="parts.Sigil" name="thumb-down" library="shorts" />
      <span>Dislike</span>
    </button>
    <button class="shorts__action">
      <component :is="parts.Sigil" name="comment" library="shorts" />
      <span>{{ comments }}</span>
    </button>
    <button class="shorts__action">
      <component :is="parts.Sigil" name="share" library="shorts" />
      <span>Share</span>
    </button>
    <component :is="parts.QualityButton" :player="handle" class="shorts__action" v-slot="{ currentLabel }">
      <component :is="parts.Sigil" name="quality" library="shorts" />
      <span>{{ currentLabel }}</span>
    </component>
  </div>
</template>

<style scoped>
@import '../styles/rail.css';
</style>
