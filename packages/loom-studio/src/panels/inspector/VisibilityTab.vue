<script setup>
import { computed } from 'vue'
import OverrideMark from '../OverrideMark.vue'
import { valueOptions } from '../options'
import { overridesIn, tabEmits, tabProps } from './shared'

/** Show when: render the element only while a value is truthy, or falsy. */
const props = defineProps(tabProps)
const emit = defineEmits(tabEmits)

const overridden = computed(() => overridesIn(props.variant?.override))
const conditionOptions = computed(() => valueOptions(props.kit, props.definition, props.node.id, (o) => o.type !== 'action'))

/** The node's `if`, split into the value and whether it's negated (`!story.isLocked`). */
const condition = computed(() => {
  const path = props.node.if
  return path ? { negate: path.startsWith('!'), path: path.replace(/^!/, '') } : undefined
})

function setCondition(path, negate = condition.value?.negate ?? false) {
  emit('edit', (node) => {
    if (path) node.if = negate ? `!${path}` : path
    else delete node.if
  })
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <p class="text-xs text-muted">Render only when a value is truthy.</p>
      <OverrideMark v-if="variant && overridden.if" :variant="variant.label" @reset="emit('reset', { field: 'if' })" />
    </div>
    <div class="flex items-center gap-1">
      <USelect
        :model-value="condition?.path"
        :items="conditionOptions"
        value-key="value"
        placeholder="Always"
        icon="i-lucide-eye"
        size="xs"
        class="min-w-0 flex-1"
        @update:model-value="setCondition($event)"
      />
      <UButton v-if="condition" icon="i-lucide-x" size="xs" color="neutral" variant="ghost" aria-label="Always" @click="setCondition(undefined)" />
    </div>
    <USwitch
      v-if="condition"
      :model-value="condition.negate"
      label="…when it's falsy instead"
      size="xs"
      @update:model-value="setCondition(condition.path, $event)"
    />
  </div>
</template>
