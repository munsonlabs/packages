<script setup lang="ts">
import Icon from '@/shared/Icon.vue'

withDefaults(
  defineProps<{
    label: string
    ariaLabel?: string
    icon?: string
    iconHtml?: string
    active?: boolean
    value?: string
  }>(),
  { ariaLabel: '', active: false },
)

defineEmits<{ click: [] }>()
</script>

<template>
  <button class="controls__more-row" :class="{ 'controls__more-row--active': active }" :aria-label="ariaLabel || label" @click="$emit('click')">
    <span v-if="icon || iconHtml" class="controls__more-row-label">
      <Icon v-if="icon" :name="icon" class="controls__more-row-icon" />
      <span v-else class="controls__more-row-icon" v-html="iconHtml" />
      {{ label }}
    </span>
    <span v-else>{{ label }}</span>
    <span v-if="value !== undefined" class="controls__more-value">{{ value }}</span>
  </button>
</template>

<style scoped>
.controls__more-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 4px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s;
}

.controls__more-row:hover {
  background: rgba(255, 255, 255, 0.08);
}

.controls__more-row-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.controls__more-row-icon,
.controls__more-row-icon :deep(svg) {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.controls__more-value {
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
}

.controls__more-row--active .controls__more-value {
  color: var(--mlv-accent, #3b82f6);
}
</style>
