<script setup>
import { computed, ref } from 'vue'
import ActionTab from './ActionTab.vue'
import ContentTab from './ContentTab.vue'
import StyleTab from './StyleTab.vue'
import VisibilityTab from './VisibilityTab.vue'
import { overridesIn, tabEmits, tabProps } from './shared'

/**
 * The selected element's editor: a tab bar, and the tab it shows. Each tab is its own
 * component taking the same props; a warning dot marks a tab the variant being edited changes.
 */
const props = defineProps(tabProps)
const emit = defineEmits(tabEmits)

const spec = computed(() => props.kit.blocks[props.node.type])
const overridden = computed(() => overridesIn(props.variant?.override))

const tabs = computed(() =>
  [
    {
      label: 'Content',
      value: 'content',
      icon: 'i-lucide-pencil-line',
      component: ContentTab,
      show: Object.keys(spec.value?.props ?? {}).length > 0,
      dot: Object.keys(spec.value?.props ?? {}).some((n) => overridden.value.prop(n)),
    },
    { label: 'Actions', value: 'actions', icon: 'i-lucide-zap', component: ActionTab, show: !!spec.value?.clickable, dot: overridden.value.click },
    { label: 'Show when', value: 'visibility', icon: 'i-lucide-eye', component: VisibilityTab, show: true, dot: overridden.value.if },
    { label: 'Style', value: 'style', icon: 'i-lucide-paintbrush', component: StyleTab, show: true, dot: overridden.value.style },
  ].filter((t) => t.show),
)
const tab = ref(tabs.value[0]?.value ?? 'visibility')
const current = computed(() => tabs.value.find((t) => t.value === tab.value) ?? tabs.value[0])
</script>

<template>
  <p v-if="!spec" class="p-3 text-xs text-error">Unknown block "{{ node.type }}": add it to the kit to edit this widget.</p>
  <div v-else class="flex flex-col">
    <div class="flex gap-0.5 border-b border-default px-2">
      <button
        v-for="t in tabs"
        :key="t.value"
        type="button"
        class="relative flex items-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors"
        :class="tab === t.value ? 'text-primary' : 'text-muted hover:text-default'"
        @click="tab = t.value"
      >
        <UIcon :name="t.icon" class="size-3.5" />
        {{ t.label }}
        <span v-if="t.dot" class="size-1.5 rounded-full bg-warning" />
        <span v-if="tab === t.value" class="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary" />
      </button>
    </div>

    <div class="max-h-[min(60vh,520px)] overflow-y-auto p-3">
      <component
        :is="current.component"
        :kit="kit"
        :definition="definition"
        :node="node"
        :variant="variant"
        @edit="emit('edit', $event)"
        @reset="emit('reset', $event)"
      />
    </div>
  </div>
</template>
