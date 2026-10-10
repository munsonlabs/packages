<script setup>
import { computed } from 'vue'
import { valueOptions } from '../options'
import { tabEmits, tabProps } from './shared'

/** Each of the block's props: bound to data, or a value typed in or picked from a list. */
const props = defineProps(tabProps)
const emit = defineEmits(tabEmits)

const spec = computed(() => props.kit.blocks[props.node.type])

const staticValue = (name, prop) => props.node.props?.[name] ?? prop.default

function setStatic(name, value) {
  emit('edit', (node) => {
    node.props = { ...node.props, [name]: value }
  })
}

/** What this prop can be bound to: values of the types it accepts, grouped by source. */
const bindOptions = (prop) => valueOptions(props.kit, props.definition, props.node.id, (o) => o.type !== 'action' && !!prop.accepts?.includes(o.type))

function setBind(name, path) {
  emit('edit', (node) => {
    const { [name]: _, ...rest } = node.bind ?? {}
    node.bind = path ? { ...rest, [name]: path } : rest
    if (!Object.keys(node.bind).length) delete node.bind
  })
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <UFormField v-for="(prop, name) in spec.props" :key="name" :label="prop.label" size="xs">
      <div class="flex flex-col gap-1.5">
        <div v-if="prop.accepts" class="flex items-center gap-1">
          <USelect
            :model-value="node.bind?.[name]"
            :items="bindOptions(prop)"
            value-key="value"
            placeholder="Bind to data…"
            icon="i-lucide-link"
            size="xs"
            :color="node.bind?.[name] ? 'primary' : 'neutral'"
            :highlight="!!node.bind?.[name]"
            class="min-w-0 flex-1"
            @update:model-value="setBind(name, $event)"
          />
          <UButton
            v-if="node.bind?.[name]"
            icon="i-lucide-unlink"
            size="xs"
            color="neutral"
            variant="ghost"
            aria-label="Unbind"
            @click="setBind(name, undefined)"
          />
        </div>
        <template v-if="!node.bind?.[name]">
          <USelect
            v-if="prop.type === 'enum'"
            :model-value="staticValue(name, prop)"
            :items="prop.options"
            size="xs"
            @update:model-value="setStatic(name, $event)"
          />
          <USwitch
            v-else-if="prop.type === 'boolean'"
            :model-value="!!staticValue(name, prop)"
            size="xs"
            @update:model-value="setStatic(name, $event)"
          />
          <UInputNumber
            v-else-if="prop.type === 'number'"
            :model-value="Number(staticValue(name, prop) ?? 0)"
            :min="0"
            size="xs"
            @update:model-value="setStatic(name, $event)"
          />
          <UInput v-else :model-value="String(staticValue(name, prop) ?? '')" size="xs" @update:model-value="setStatic(name, $event)" />
        </template>
      </div>
    </UFormField>
  </div>
</template>
