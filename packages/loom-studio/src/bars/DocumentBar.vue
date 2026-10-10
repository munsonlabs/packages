<script setup>
import { useStudio } from '../studio'

/** Top right: undo and redo. */
const s = useStudio()
</script>

<template>
  <div class="loom-bar absolute top-3 right-3 flex items-center gap-0.5 rounded-full p-1">
    <UTooltip text="Undo" :kbds="['meta', 'z']">
      <UButton
        icon="i-lucide-undo-2"
        size="sm"
        color="neutral"
        variant="ghost"
        class="rounded-full"
        :disabled="!s.history.canUndo"
        aria-label="Undo"
        @click="s.history.undo"
      />
    </UTooltip>
    <UTooltip text="Redo" :kbds="['meta', 'shift', 'z']">
      <UButton
        icon="i-lucide-redo-2"
        size="sm"
        color="neutral"
        variant="ghost"
        class="rounded-full"
        :disabled="!s.history.canRedo"
        aria-label="Redo"
        @click="s.history.redo"
      />
    </UTooltip>
  </div>
</template>
