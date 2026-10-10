<script setup>
import { computed } from 'vue'
import { parseAction } from '@munsonlabs/loom/editor'
import OverrideMark from '../OverrideMark.vue'
import { valueOptions } from '../options'
import { overridesIn, tabEmits, tabProps } from './shared'

/** What tapping the element runs: one of the kit's actions, and optionally the value it gets. */
const props = defineProps(tabProps)
const emit = defineEmits(tabEmits)

const overridden = computed(() => overridesIn(props.variant?.override))
const actionOptions = computed(() => valueOptions(props.kit, props.definition, props.node.id, (o) => o.type === 'action'))
const argOptions = computed(() => valueOptions(props.kit, props.definition, props.node.id, (o) => o.type !== 'action'))

/** The current tap binding as `{ action, arg? }`. */
const binding = computed(() => (props.node.on?.click ? parseAction(props.node.on.click) : undefined))

function setAction(action, arg) {
  emit('edit', (node) => {
    const { click: _, ...rest } = node.on ?? {}
    node.on = action ? { ...rest, click: arg ? { action, arg } : action } : rest
    if (!Object.keys(node.on).length) delete node.on
  })
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <UFormField label="When tapped" size="xs">
      <template #hint>
        <OverrideMark v-if="variant && overridden.click" :variant="variant.label" @reset="emit('reset', { field: 'event', name: 'click' })" />
      </template>
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center gap-1">
          <USelect
            :model-value="binding?.action"
            :items="actionOptions"
            value-key="value"
            placeholder="Do nothing"
            icon="i-lucide-zap"
            size="xs"
            class="min-w-0 flex-1"
            @update:model-value="setAction($event, binding?.arg)"
          />
          <UButton
            v-if="binding"
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="ghost"
            aria-label="Remove action"
            @click="setAction(undefined)"
          />
        </div>
        <div v-if="binding" class="flex items-center gap-1">
          <USelect
            :model-value="binding.arg"
            :items="argOptions"
            value-key="value"
            placeholder="With its default argument"
            icon="i-lucide-corner-down-right"
            size="xs"
            class="min-w-0 flex-1"
            @update:model-value="setAction(binding.action, $event)"
          />
          <UButton
            v-if="binding.arg"
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="ghost"
            aria-label="Remove argument"
            @click="setAction(binding.action)"
          />
        </div>
      </div>
    </UFormField>
    <p v-if="!actionOptions.length" class="text-xs text-muted">The kit has no actions to bind.</p>
  </div>
</template>
