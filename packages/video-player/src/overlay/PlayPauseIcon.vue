<script setup lang="ts">
import Icon from '@/shared/Icon.vue'

withDefaults(defineProps<{ isPlaying: boolean; hasEnded?: boolean }>(), {
  hasEnded: false,
})
</script>

<template>
  <Icon name="pause" v-if="isPlaying" />
  <Icon name="replay" v-else-if="hasEnded" />
  <Icon name="play" v-else />
</template>
