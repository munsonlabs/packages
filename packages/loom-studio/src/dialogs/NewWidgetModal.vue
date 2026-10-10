<script setup>
import { computed, ref, watch } from 'vue'
import { createDefinition } from '@munsonlabs/loom/editor'

const open = defineModel('open', { type: Boolean, default: false })
const props = defineProps({
  kit: { type: Object, required: true },
  /** Ids already in use, so the new one doesn't collide. */
  takenIds: Array,
})
const emit = defineEmits(['create'])

const types = props.kit.kinds
const typeId = ref(types[0]?.id ?? 'article')
const name = ref('')

watch(open, (isOpen) => {
  if (!isOpen) return
  name.value = ''
  typeId.value = types[0]?.id ?? 'article'
})

const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'widget'

const id = computed(() => {
  const base = slug(name.value || `${typeId.value} widget`)
  const taken = new Set(props.takenIds)
  let candidate = base
  for (let n = 2; taken.has(candidate); n++) candidate = `${base}-${n}`
  return candidate
})

function create() {
  const type = types.find((t) => t.id === typeId.value)
  emit('create', createDefinition(props.kit, typeId.value, { id: id.value, name: name.value.trim() || `${type?.label ?? 'New'} widget` }))
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" title="New widget" description="Pick the kind of data it's for. It starts from that kind's layout.">
    <template #body>
      <form class="flex flex-col gap-4" @submit.prevent="create">
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="type in types"
            :key="type.id"
            type="button"
            class="flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors"
            :class="type.id === typeId ? 'border-primary bg-primary/5' : 'border-default hover:bg-elevated'"
            @click="typeId = type.id"
          >
            <span class="flex items-center gap-2 font-medium">
              <UIcon :name="type.icon ?? 'i-lucide-box'" class="size-4 text-primary" />
              {{ type.label }}
            </span>
            <span class="text-xs text-muted">{{ type.description }}</span>
          </button>
        </div>
        <UFormField label="Name" :hint="`id: ${id}`">
          <UInput
            v-model="name"
            :placeholder="`${types.find((t) => t.id === typeId)?.label ?? ''} widget`"
            class="w-full"
            autocomplete="off"
            data-1p-ignore
            autofocus
          />
        </UFormField>
        <div class="flex justify-end">
          <UButton type="submit" label="Create" icon="i-lucide-plus" />
        </div>
      </form>
    </template>
  </UModal>
</template>
