<script setup>
import { viewportHint, viewports } from '../preview/usePreview'
import { useStudio } from '../studio'

/** Bottom centre: how the widget is previewed. The sample data, and the width. */
const s = useStudio()
</script>

<template>
  <div class="loom-bar absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full p-1">
    <USelect
      v-model="s.preview.sampleIndex"
      :items="s.preview.sampleOptions"
      value-key="value"
      icon="i-lucide-database"
      size="sm"
      variant="ghost"
      class="w-48"
      aria-label="Preview data"
    />

    <div class="flex items-center">
      <UTooltip v-for="vp in viewports" :key="vp.label" :text="`${vp.label}: ${viewportHint(vp.width)}`">
        <UButton
          :icon="vp.icon"
          size="sm"
          :color="s.preview.viewport === vp ? 'primary' : 'neutral'"
          :variant="s.preview.viewport === vp ? 'soft' : 'ghost'"
          class="rounded-full"
          :aria-label="vp.label"
          @click="s.preview.viewport = vp"
        />
      </UTooltip>
    </div>
  </div>
</template>
