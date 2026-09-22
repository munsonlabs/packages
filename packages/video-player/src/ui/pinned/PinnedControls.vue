<script setup lang="ts">
import Icon from '@/ui/shared/Icon.vue'

defineEmits<{ 'scroll-to': []; dismiss: [] }>()
</script>

<template>
  <button class="pinned-controls__scroll-to" aria-label="Scroll to player" @click.stop="$emit('scroll-to')">
    <Icon name="expand" />
  </button>

  <button class="pinned-controls__dismiss" aria-label="Close" @click.stop="$emit('dismiss')">
    <Icon name="close" />
  </button>
</template>

<style scoped>
.pinned-controls__dismiss,
.pinned-controls__scroll-to {
  position: absolute;
  top: 0.4rem;
  z-index: 25;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.pinned-controls__dismiss:hover,
.pinned-controls__scroll-to:hover {
  background: rgba(0, 0, 0, 0.85);
}

.pinned-controls__dismiss :deep(svg),
.pinned-controls__scroll-to :deep(svg) {
  width: 14px;
  height: 14px;
}

.pinned-controls__dismiss {
  right: 0.4rem;
}

.pinned-controls__scroll-to {
  left: 0.4rem;
}
</style>
