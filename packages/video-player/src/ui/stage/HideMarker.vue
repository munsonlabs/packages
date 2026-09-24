<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { isStageTucked } from '@/registries/stageRegistry'

const el = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!el.value) return
  observer = new IntersectionObserver(([entry]) => {
    isStageTucked.value = entry.isIntersecting
  })
  observer.observe(el.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  isStageTucked.value = false
})
</script>

<template>
  <div ref="el" class="ml-video-hide-marker" />
</template>

<style scoped>
.ml-video-hide-marker {
  width: 100%;
  min-height: 1px;
}
</style>
