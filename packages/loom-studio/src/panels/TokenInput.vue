<script setup>
import { computed, ref } from 'vue'
import { scaleForRole, scaleTokens, tokens } from '@munsonlabs/loom/editor'

/**
 * A value picked from a token scale (`var(--w-space-3)`), with a custom escape hatch.
 * Without a scale it's a plain text input.
 */
const props = defineProps({
  modelValue: String,
  scale: String,
  placeholder: String,
})
const emit = defineEmits(['update:modelValue'])

const CUSTOM = '__custom'

const options = computed(() => {
  if (!props.scale) return []
  const steps = scaleTokens(props.scale).map((t) => ({ label: t.label, value: `var(--w-${t.name})`, description: t.default, name: t.name }))
  // Role tokens on the same scale ("the widget's gap") are often the better pick: they follow the theme's intent.
  const roles = tokens
    .filter((t) => scaleForRole[t.name] === props.scale)
    .map((t) => ({ label: t.label, value: `var(--w-${t.name})`, description: 'Follows the theme', name: t.name }))
  return [
    ...(roles.length ? [[{ type: 'label', label: 'Roles' }, ...roles]] : []),
    [{ type: 'label', label: 'Scale' }, ...steps],
    [{ label: 'Custom…', value: CUSTOM }],
  ]
})

const known = computed(() => options.value.flat().some((o) => 'value' in o && o.value === props.modelValue))
/** Set when "Custom…" is picked before anything's typed, so the input shows. */
const customising = ref(false)
const selected = computed(() => (customising.value || (props.modelValue && !known.value) ? CUSTOM : props.modelValue || undefined))

const isColor = computed(() => props.scale === 'color')
/** A swatch for colours: the token's resolved default, or the custom value itself. */
const swatch = computed(() => {
  const value = props.modelValue ?? ''
  const name = value.match(/^var\(--w-([a-z0-9-]+)\)$/)?.[1]
  return name ? (tokens.find((t) => t.name === name)?.default ?? 'transparent') : value
})

function pick(value) {
  customising.value = value === CUSTOM
  if (value !== CUSTOM) emit('update:modelValue', value)
}
</script>

<template>
  <UInput
    v-if="!scale"
    :model-value="modelValue ?? ''"
    :placeholder="placeholder"
    size="xs"
    class="min-w-0 flex-1"
    @update:model-value="emit('update:modelValue', String($event))"
  />
  <div v-else class="flex min-w-0 flex-1 items-center gap-1">
    <USelect
      :model-value="selected"
      :items="options"
      value-key="value"
      :placeholder="placeholder ?? 'Default'"
      size="xs"
      class="min-w-0 flex-1"
      @update:model-value="pick(String($event))"
    >
      <template v-if="isColor && modelValue" #leading>
        <span class="size-3 rounded-sm ring ring-default" :style="{ background: swatch }" />
      </template>
    </USelect>
    <template v-if="selected === CUSTOM">
      <UPopover v-if="isColor">
        <button type="button" class="size-6 shrink-0 rounded-md ring ring-default" :style="{ background: modelValue }" aria-label="Pick colour" />
        <template #content>
          <UColorPicker
            :model-value="modelValue?.startsWith('#') ? modelValue : '#000000'"
            class="p-2"
            @update:model-value="emit('update:modelValue', String($event))"
          />
        </template>
      </UPopover>
      <UInput
        :model-value="modelValue ?? ''"
        size="xs"
        class="w-24 shrink-0"
        :placeholder="isColor ? '#hex' : 'value'"
        @update:model-value="emit('update:modelValue', String($event))"
      />
    </template>
  </div>
</template>
