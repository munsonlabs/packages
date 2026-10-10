<script setup>
/** Marks a field the active variant overrides, with a way back to the base value. */
defineProps({
  variant: { type: String, required: true },
})
const emit = defineEmits(['reset'])
</script>

<template>
  <UTooltip :text="`Overridden in ${variant}: reset to base`">
    <button type="button" class="group inline-flex items-center gap-1 text-[11px] font-medium text-warning" @click.stop="emit('reset')">
      <span class="size-1.5 rounded-full bg-warning group-hover:hidden" />
      <UIcon name="i-lucide-rotate-ccw" class="hidden size-3 group-hover:block" />
      <span>{{ variant }}</span>
    </button>
  </UTooltip>
</template>
