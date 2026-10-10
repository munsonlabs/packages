<script setup>
import { useStudio } from '../studio'

/** Top left: the widget's name, its kind, and the host app's own controls (the `actions` slot). */
const s = useStudio()
</script>

<template>
  <div data-tour="identity" class="loom-bar absolute top-3 left-3 flex items-center gap-1 rounded-full py-1 pr-1 pl-3">
    <UIcon name="i-lucide-blocks" class="size-4 text-primary" />
    <UInput
      :model-value="s.definition.name"
      variant="none"
      size="sm"
      class="w-40"
      :ui="{ base: 'font-medium' }"
      aria-label="Widget name"
      @update:model-value="s.history.change((d) => (d.name = String($event)))"
    />
    <UTooltip v-if="s.preview.kind" :text="s.preview.kind.description ?? s.preview.kind.label">
      <UBadge :label="s.preview.kind.label" :icon="s.preview.kind.icon" color="neutral" variant="soft" size="sm" class="rounded-full" />
    </UTooltip>
    <slot />
  </div>
</template>
