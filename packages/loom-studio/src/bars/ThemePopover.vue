<script setup>
import TokensEditor from '../panels/TokensEditor.vue'
import { useStudio } from '../studio'

/** The theme button and its panel: every design token, and what this widget overrides. */
const s = useStudio()
</script>

<template>
  <UPopover v-model:open="s.open.theme" :content="{ align: 'end', sideOffset: 8 }">
    <UTooltip text="Theme">
      <UButton icon="i-lucide-palette" size="sm" color="neutral" variant="ghost" class="rounded-full" aria-label="Theme" />
    </UTooltip>
    <template #content>
      <div class="max-h-[75vh] w-[30rem] overflow-y-auto p-3">
        <USwitch
          :model-value="!!s.definition.fixedColors"
          label="Fixed colours"
          description="This widget looks the same in light and dark, so its own colours are deliberate."
          size="xs"
          class="mb-3"
          @update:model-value="s.history.change((d) => ($event ? (d.fixedColors = true) : delete d.fixedColors))"
        />
        <TokensEditor
          :vars="s.definition.vars ?? {}"
          :theme="s.preview.panelTheme"
          :dark="s.preview.darkTheme"
          @change="(vars) => s.history.change((d) => (d.vars = Object.keys(vars).length ? vars : undefined))"
        />
      </div>
    </template>
  </UPopover>
</template>
