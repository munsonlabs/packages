<script setup lang="ts">
import { IconPlay, IconPause, IconReplay } from '@/components/icons'

withDefaults(defineProps<{ isPlaying: boolean; hasEnded?: boolean }>(), {
  hasEnded: false,
})
</script>

<template>
  <IconPause v-if="isPlaying" />
  <IconReplay v-else-if="hasEnded" />
  <IconPlay v-else />
</template>
