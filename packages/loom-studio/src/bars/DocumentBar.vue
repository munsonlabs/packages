<script setup>
import { computed } from 'vue'
import { useColorMode } from '@vueuse/core'
import { useStudio } from '../studio'
import IssuesPopover from './IssuesPopover.vue'
import ThemePopover from './ThemePopover.vue'

/** Top right: the studio's own appearance, undo and redo, theme, ⌘K, issues, export and publish. */
const s = useStudio()

/** The studio's own light or dark appearance (Nuxt UI's colour mode), separate from the preview's. */
const appearance = useColorMode()
const appearanceOptions = {
  auto: { label: 'Studio: follows the system', icon: 'i-lucide-monitor', next: 'light' },
  light: { label: 'Studio: light', icon: 'i-lucide-sun', next: 'dark' },
  dark: { label: 'Studio: dark', icon: 'i-lucide-moon', next: 'auto' },
}
const appearanceMode = computed(() => appearance.store.value)
const cycleAppearance = () => (appearance.store.value = appearanceOptions[appearanceMode.value].next)
</script>

<template>
  <div class="loom-bar absolute top-3 right-3 flex items-center gap-0.5 rounded-full p-1">
    <UTooltip :text="appearanceOptions[appearanceMode].label">
      <UButton
        :icon="appearanceOptions[appearanceMode].icon"
        size="sm"
        color="neutral"
        variant="ghost"
        class="rounded-full"
        aria-label="Studio appearance"
        @click="cycleAppearance"
      />
    </UTooltip>
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

    <UTooltip text="Layers" :kbds="['l']">
      <UButton
        icon="i-lucide-layers"
        size="sm"
        color="neutral"
        :variant="s.open.layers ? 'soft' : 'ghost'"
        class="rounded-full"
        aria-label="Layers"
        @click="s.open.layers = !s.open.layers"
      />
    </UTooltip>

    <ThemePopover />

    <UTooltip text="Everything" :kbds="['meta', 'k']">
      <UButton
        icon="i-lucide-search"
        size="sm"
        color="neutral"
        variant="ghost"
        class="rounded-full"
        aria-label="Command palette"
        @click="s.open.palette = true"
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
