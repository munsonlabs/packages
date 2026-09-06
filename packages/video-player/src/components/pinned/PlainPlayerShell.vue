<script setup lang="ts">
defineProps<{ isPlaying: boolean }>()

function noop(): void {}
</script>

<template>
  <div class="player-wrapper">
    <slot :is-pinned="false" :is-tucked="false" :set-box-el="noop" :unpin="noop" :scroll-to-player="noop" />
  </div>
</template>

<style scoped>
.player-wrapper {
  display: contents;
}
</style>
