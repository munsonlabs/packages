<script setup>
import { computed, ref, watch } from 'vue'
import { DEFINITION_VERSION } from '@munsonlabs/loom'
import { matchFrom, rowsFrom } from './conditions'
import MatchFields from './MatchFields.vue'

/**
 * Starts a widget: a name, a layout to start from (blank, or a copy of one in the library), when
 * it renders and what it uses. A copy starts with its source's conditions and sources. Emits
 * `create(definition)`; adding it to the library is the app's job.
 */

const open = defineModel('open', { type: Boolean, default: false })
const props = defineProps({
  kit: { type: Object, required: true },
  /** Widgets a new one can start as a copy of: usually the app's library. */
  widgets: { type: Array, default: () => [] },
  /** Data to test its conditions on. */
  samples: { type: Array, default: () => [] },
  /** Ids already in use, so the new one doesn't collide. */
  takenIds: Array,
})
const emit = defineEmits(['create'])

/** The "start from" menu's blank layout. Reka's select can't take an empty value. */
const BLANK = '-'
const blankLayout = () => ({ root: { id: 'root', type: 'Stack', children: [] } })

const name = ref('')
const startFrom = ref(BLANK)
const rows = ref([])
const uses = ref([])

const startItems = computed(() => [
  { label: 'A blank widget', value: BLANK },
  ...props.widgets.map((w) => ({ label: `A copy of ${w.name}`, value: w.id })),
])
const startWidget = computed(() => props.widgets.find((w) => w.id === startFrom.value))
const primarySources = () =>
  Object.values(props.kit.sources)
    .filter((s) => s.primary)
    .map((s) => s.id)

watch(open, (isOpen) => {
  if (!isOpen) return
  name.value = ''
  startFrom.value = BLANK
})

// A copy starts where its source is: same conditions, same sources. A blank one takes any data and the kit's primary sources.
watch(
  [open, startWidget],
  () => {
    rows.value = rowsFrom(startWidget.value?.match)
    uses.value = [...(startWidget.value ? (startWidget.value.uses ?? Object.keys(props.kit.sources)) : primarySources())]
  },
  { immediate: true },
)

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
    match: ___,
    uses: ____,
    ...layout
  } = startWidget.value ? JSON.parse(JSON.stringify(startWidget.value)) : { version: DEFINITION_VERSION, ...blankLayout() }
  const match = matchFrom(rows.value)
  emit('create', { ...layout, id: id.value, name: name.value.trim() || 'New widget', ...(match.length ? { match } : {}), uses: [...uses.value] })
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="New widget"
    description="Name it, pick where it starts, and say which data it's for."
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <form id="new-widget-form" class="flex flex-col gap-5" @submit.prevent="create">
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Name" :hint="`id: ${id}`">
            <UInput v-model="name" placeholder="Breaking news" class="w-full" autocomplete="off" data-1p-ignore autofocus />
          </UFormField>
          <UFormField label="Starts as">
            <USelect v-model="startFrom" :items="startItems" value-key="value" class="w-full" />
          </UFormField>
        </div>
        <MatchFields v-model:rows="rows" v-model:uses="uses" :kit="kit" :samples="samples" />
      </form>
    </template>
    <template #footer>
      <div class="flex w-full justify-end">
        <UButton type="submit" form="new-widget-form" label="Create" icon="i-lucide-plus" />
      </div>
    </template>
  </UModal>
</template>
