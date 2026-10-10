<script setup>
import { useStudio } from '../studio'
import IssuesPopover from './IssuesPopover.vue'

/** Top right: undo and redo, issues, export and publish. */
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

    <IssuesPopover />

    <UTooltip text="Export">
      <UButton
        icon="i-lucide-download"
        size="sm"
        color="neutral"
        variant="ghost"
        class="rounded-full"
        aria-label="Export"
        @click="s.open.export = true"
      />
    </UTooltip>
    <UButton label="Publish" icon="i-lucide-send" size="sm" class="ml-1 rounded-full" :disabled="s.errors" @click="s.publish" />
  </div>
</template>
