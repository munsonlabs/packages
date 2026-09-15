<script setup lang="ts">
import { computed, ref, useSlots } from 'vue'
import type { VNode } from 'vue'

defineOptions({ name: 'CodeTabs' })

const slots = useSlots()
const active = ref(0)

const panels = computed(() => {
  const children = slots.default?.() ?? []
  return children.filter((node): node is VNode => Boolean(node) && typeof node.type !== 'symbol')
})
</script>

<template>
  <div role="tablist" class="my-5 rounded-md border border-muted bg-muted/40">
    <div class="flex flex-wrap gap-1 border-b border-muted px-2 pt-2">
      <button
        v-for="(node, i) in panels"
        :key="i"
        type="button"
        role="tab"
        :aria-selected="active === i"
        class="text-sm font-semibold rounded-md px-3 py-1.5 transition-colors"
        :class="active === i ? 'bg-background text-primary shadow-sm' : 'text-muted hover:text-primary'"
        @click="active = i"
      >
        {{ (node.props as Record<string, unknown>)?.label || `Tab ${i + 1}` }}
      </button>
    </div>
    <div
      v-for="(panel, i) in panels"
      :key="i"
      role="tabpanel"
      :hidden="active !== i"
    >
      <component :is="panel" />
    </div>
  </div>
</template>