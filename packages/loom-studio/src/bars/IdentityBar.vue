<script setup>
import { describeMatch } from '../dialogs/conditions'
import { useStudio } from '../studio'

/** Top left: the widget's name, when it renders (opens the conditions editor), and the host app's own controls (the `actions` slot). */
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
    <UTooltip text="When it renders, and the composables it uses">
      <UButton
        :label="describeMatch(s.definition.match)"
        icon="i-lucide-filter"
        color="neutral"
        variant="soft"
        size="xs"
        class="max-w-56 rounded-full"
        :ui="{ label: 'truncate' }"
        aria-label="When it renders"
        @click="s.open.match = true"
      />
    </UTooltip>
    <slot />
  </div>
</template>
