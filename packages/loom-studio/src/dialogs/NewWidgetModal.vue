<script setup>
import { computed, ref, watch } from 'vue'
import { DEFINITION_VERSION } from '@munsonlabs/loom'
import { describeMatch } from './conditions'

/**
 * Starts a widget: a name, and a layout to start from (blank, or a copy of one in the library).
 * A copy keeps its conditions and sources. Emits `create(definition)`; adding it to the library
 * is the app's job.
 */

const open = defineModel('open', { type: Boolean, default: false })
const props = defineProps({
  kit: { type: Object, required: true },
  /** Widgets a new one can start as a copy of: usually the app's library. */
  widgets: { type: Array, default: () => [] },
  /** Ids already in use, so the new one doesn't collide. */
  takenIds: Array,
})
const emit = defineEmits(['create'])

/** The "start from" menu's blank layout. Reka's select can't take an empty value. */
const BLANK = '-'
const blankLayout = () => ({ root: { id: 'root', type: 'Stack', children: [] } })

const name = ref('')
const startFrom = ref(BLANK)

const startItems = computed(() => [
  { label: 'A blank widget', value: BLANK },
  ...props.widgets.map((w) => ({ label: `A copy of ${w.name}`, value: w.id })),
])
const startWidget = computed(() => props.widgets.find((w) => w.id === startFrom.value))

watch(open, (isOpen) => {
  if (!isOpen) return
  name.value = ''
  startFrom.value = BLANK
})

const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'widget'

const id = computed(() => {
  const base = slug(name.value || 'new widget')
  const taken = new Set(props.takenIds)
  let candidate = base
  for (let n = 2; taken.has(candidate); n++) candidate = `${base}-${n}`
  return candidate
})

function create() {
  // A copy through JSON, since a library is JSON and may sit in reactive state.
  const {
    id: _,
    name: __,
    ...layout
  } = startWidget.value ? JSON.parse(JSON.stringify(startWidget.value)) : { version: DEFINITION_VERSION, ...blankLayout() }
  emit('create', { ...layout, id: id.value, name: name.value.trim() || 'New widget' })
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" title="New widget" description="Name it, and pick where it starts.">
    <template #body>
      <form class="flex flex-col gap-4" @submit.prevent="create">
        <UFormField label="Name" :hint="`id: ${id}`">
          <UInput v-model="name" placeholder="Breaking news" class="w-full" autocomplete="off" data-1p-ignore autofocus />
        </UFormField>
        <UFormField
          label="Starts as"
          :help="startWidget ? `Renders for the same data as its original: ${describeMatch(startWidget.match)}.` : 'Renders for any data.'"
        >
          <USelect v-model="startFrom" :items="startItems" value-key="value" class="w-full" />
        </UFormField>
        <div class="flex justify-end">
          <UButton type="submit" label="Create" icon="i-lucide-plus" />
        </div>
      </form>
    </template>
  </UModal>
</template>
