<script setup lang="ts">
import Icon from '@/components/Icon.vue'

defineProps<{ isAudible: boolean }>()
</script>

<template>
  <Icon name="volume-on" v-if="isAudible" />
  <Icon name="volume-mute" v-else />
</template>
