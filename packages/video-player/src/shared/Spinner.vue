<script setup lang="ts">
withDefaults(defineProps<{ size?: number; borderWidth?: number }>(), {
  size: 14,
  borderWidth: 2,
})
</script>

<template>
  <div class="spinner" :style="{ width: `${size}px`, height: `${size}px`, borderWidth: `${borderWidth}px` }" />
</template>

<style scoped>
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  border-radius: 50%;
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.15);
  border-top-color: rgba(255, 255, 255, 0.8);
  animation: spin 0.75s linear infinite;
}
</style>
