<script setup>
import { computed } from 'vue'
import { useStudio } from '../studio'

/** Top left: the widget's name, the data it renders for, and the host app's own controls (the `actions` slot). */
const s = useStudio()

const OPS = { equals: 'is', in: 'is one of', includes: 'contains', exists: 'is set' }
const NEGATED = { equals: 'is not', in: 'is not one of', includes: "doesn't contain", exists: "isn't set" }
const valueText = (v) => (Array.isArray(v) ? v.map(valueText).join(', ') : typeof v === 'string' ? v : JSON.stringify(v))

/** One line per condition, as the badge's tooltip reads them. */
const conditions = computed(() =>
  (s.definition.match ?? []).map((c) => {
    const negated = c.path.startsWith('!')
    return `${c.path.replace(/^!/, '')} ${(negated ? NEGATED : OPS)[c.op] ?? c.op}${c.op === 'exists' ? '' : ` ${valueText(c.value)}`}`
  }),
)
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
    <UTooltip :text="conditions.length ? `Renders when ${conditions.join(' and ')}` : 'Renders for any data'">
      <UBadge
        :label="conditions.length ? conditions[0] + (conditions.length > 1 ? ` +${conditions.length - 1}` : '') : 'Any data'"
        icon="i-lucide-filter"
        color="neutral"
        variant="soft"
        size="sm"
        class="max-w-56 truncate rounded-full"
      />
    </UTooltip>
    <slot />
  </div>
</template>
