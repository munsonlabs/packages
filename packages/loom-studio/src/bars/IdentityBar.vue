<script setup>
import { computed } from 'vue'
import { useStudio } from '../studio'

/** Top left: the widget's name, its kind (a menu to change it), and the host app's own controls (the `actions` slot). */
const s = useStudio()

const kindItems = computed(() => [
  s.props.kit.kinds.map((k) => ({
    label: k.label,
    icon: k.icon ?? 'i-lucide-box',
    type: 'checkbox',
    checked: k.id === s.definition.kind,
    onSelect: () => s.history.change((d) => (d.kind = k.id)),
  })),
])
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
    <UTooltip :text="s.preview.kind ? (s.preview.kind.description ?? s.preview.kind.label) : 'Pick the kind of data it\'s for'">
      <UDropdownMenu :items="kindItems">
        <UButton
          :label="s.preview.kind?.label ?? 'No kind'"
          :icon="s.preview.kind?.icon ?? 'i-lucide-box'"
          trailing-icon="i-lucide-chevron-down"
          color="neutral"
          variant="soft"
          size="xs"
          class="rounded-full"
          aria-label="Kind"
        />
      </UDropdownMenu>
    </UTooltip>
    <slot />
  </div>
</template>
