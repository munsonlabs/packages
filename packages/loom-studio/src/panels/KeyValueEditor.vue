<script setup>
import { ref } from 'vue'

const props = defineProps({
  entries: { type: Object, required: true },
  keyPlaceholder: String,
  valuePlaceholder: String,
})

const emit = defineEmits(['change'])

const newKey = ref('')
const newValue = ref('')

function set(key, value) {
  emit('change', { ...props.entries, [key]: value })
}

function remove(key) {
  const { [key]: _, ...rest } = props.entries
  emit('change', rest)
}

function add() {
  const key = newKey.value.trim()
  if (!key) return
  set(key, newValue.value)
  newKey.value = ''
  newValue.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div v-for="(value, key) in entries" :key="key" class="flex items-center gap-1.5">
      <code class="w-2/5 shrink-0 truncate text-xs text-muted" :title="key">{{ key }}</code>
      <slot name="value" :name="key" :value="value" :set="(v: string) => set(key, v)">
        <UInput :model-value="value" size="xs" class="min-w-0 flex-1" @update:model-value="set(key, String($event))" />
      </slot>
      <UButton icon="i-lucide-x" size="xs" color="neutral" variant="ghost" :aria-label="`Remove ${key}`" @click="remove(key)" />
    </div>
    <form class="flex items-center gap-1.5" @submit.prevent="add">
      <UInput v-model="newKey" size="xs" class="w-2/5 shrink-0" :placeholder="keyPlaceholder ?? 'name'" />
      <UInput v-model="newValue" size="xs" class="min-w-0 flex-1" :placeholder="valuePlaceholder ?? 'value'" />
      <UButton type="submit" icon="i-lucide-plus" size="xs" color="neutral" variant="soft" aria-label="Add" :disabled="!newKey.trim()" />
    </form>
  </div>
</template>
