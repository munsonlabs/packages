<script setup>
import { viewportHint, viewports } from '../preview/usePreview'
import { useStudio } from '../studio'

/** Bottom centre: how the widget is previewed. The sample data, the theme, and the width. */
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

    <USelect
      v-if="s.preview.themeOptions.length > 1"
      v-model="s.preview.themeId"
      :items="s.preview.themeOptions"
      value-key="value"
      icon="i-lucide-palette"
      size="sm"
      variant="ghost"
      class="w-28"
      aria-label="Preview theme"
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
