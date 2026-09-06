<script setup lang="ts">
import { IconVolumeOn, IconVolumeMute } from '@/components/icons'

defineProps<{ isAudible: boolean }>()
</script>

<template>
  <IconVolumeOn v-if="isAudible" />
  <IconVolumeMute v-else />
</template>
