<script setup>
import { computed, ref, watch } from 'vue'
import { createLibrary, getKind, withKinds } from '@munsonlabs/loom'
import { shadowedWidgets } from '@munsonlabs/loom/editor'
import { KindModal, LoomStudio, NewWidgetModal } from '@munsonlabs/loom-studio'
import { useToast } from '@nuxt/ui/composables'
import { useBridge } from 'bolt-bridge-stub'
import { timelineKit, widgets as examples } from 'timeline-kit'
import { native } from './native'

/** Where the feed demo runs, which renders a published library. */
const FEED_URL = 'http://localhost:5195'
const STORAGE_KEY = 'loom-studio-demo:library'

/**
 * What the studio edits: every widget in the app's library, which one is open, and the kinds made in the studio.
 *
 * @typedef {object} Library
 * @property {WidgetDefinition[]} definitions
 * @property {string} selectedId
 * @property {KindSpec[]} [kinds]
 */

const exampleLibrary = () => ({ definitions: structuredClone(examples), selectedId: examples[0].id, kinds: [] })

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (saved?.definitions?.length) return saved
  } catch {
    // Storage blocked or unreadable: start from the examples.
  }
  return exampleLibrary()
}

const library = ref(load())
watch(
  library,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      // Not persisting is fine for a demo.
    }
  },
  { deep: true },
)

/** The timeline kit with the kinds made here. One that no longer fits is left out, so the studio still opens. */
const kit = computed(() => {
  let next = timelineKit
  for (const spec of library.value.kinds ?? []) {
    try {
      next = withKinds(next, [spec])
    } catch (e) {
      console.warn(e)
    }
  }
  return next
})

// Widgets preview against the Bolt bridge, talking to the stub native app (see main.js).
// The studio logs every call they make on it.
const bridge = useBridge()
const samples = computed(() => bridge.stories)

// Whether the reader subscribes, as the app reports it. Flipping it plays the app's part: the app
// tells the bridge, which locks or unlocks every paywalled sample, so a widget can be checked both ways.
const subscribed = computed(() => bridge.authorisationStatus.state === 'active')

/** The widget being edited, written back into the library by id. */
const definition = computed({
  get: () => library.value.definitions.find((d) => d.id === library.value.selectedId) ?? library.value.definitions[0],
  set: (next) => {
    library.value.definitions = library.value.definitions.map((d) => (d.id === next.id ? next : d))
  },
})

const widgetOptions = computed(() =>
  library.value.definitions.map((d) => ({ label: d.name, value: d.id, icon: getKind(kit.value, d.kind)?.icon ?? 'i-lucide-box' })),
)

const newOpen = ref(false)

/** The kind editor: open on a kind made here, or on none for a new one. A new one can start from the widget being edited. */
const kindEditor = ref({ open: false, kind: undefined, starter: undefined })
const editableKind = computed(() => library.value.kinds?.find((k) => k.id === definition.value.kind))

function saveKind(spec) {
  const kinds = library.value.kinds ?? []
  const at = kinds.findIndex((k) => k.id === spec.id)
  library.value.kinds = at < 0 ? [...kinds, spec] : kinds.map((k, i) => (i === at ? spec : k))
}

function removeKind(id) {
  library.value.kinds = (library.value.kinds ?? []).filter((k) => k.id !== id)
}

function addWidget(created) {
  library.value.definitions = [...library.value.definitions, created]
  library.value.selectedId = created.id
}

/** Moves the open widget one place earlier or later. Order decides between widgets of the same kind: the first is picked. */
function moveWidget(by) {
  const list = [...library.value.definitions]
  const at = list.findIndex((d) => d.id === library.value.selectedId)
  const to = at + by
  if (at < 0 || to < 0 || to >= list.length) return
  ;[list[at], list[to]] = [list[to], list[at]]
  library.value.definitions = list
}

/** The widget picked instead of the open one, when an earlier one has the same kind. */
const shadowedBy = computed(() => shadowedWidgets(library.value.definitions).get(library.value.selectedId))

/** Makes the open widget the one picked for its kind, by moving it just before the one that was. */
function useForKind() {
  const list = library.value.definitions.filter((d) => d.id !== library.value.selectedId)
  list.splice(list.indexOf(shadowedBy.value), 0, definition.value)
  library.value.definitions = list
}

const position = computed(() => library.value.definitions.findIndex((d) => d.id === library.value.selectedId))

function removeWidget() {
  if (library.value.definitions.length < 2) return
  library.value.definitions = library.value.definitions.filter((d) => d.id !== library.value.selectedId)
  library.value.selectedId = library.value.definitions[0].id
}

const toast = useToast()

/** Publishing hands the app one file: the whole library. Here that's a download the feed demo can import. */
function publish() {
  const file = `${kit.value.id}.library.json`
  const json = JSON.stringify(createLibrary(kit.value, library.value.definitions, { publishedAt: new Date(), kinds: library.value.kinds }), null, 2)
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  Object.assign(document.createElement('a'), { href: url, download: file }).click()
  URL.revokeObjectURL(url)
  toast.add({
    title: `Published ${file}`,
    description: `${library.value.definitions.length} widgets. Import it in the feed demo to see them across a timeline.`,
    icon: 'i-lucide-send',
    actions: [{ label: 'Open the feed', icon: 'i-lucide-external-link', onClick: () => void window.open(FEED_URL, 'loom-feed') }],
  })
}

/** An imported library replaces these widgets and kinds with the ones that load. */
function importLibrary(loaded) {
  if (loaded.widgets.length) library.value = { definitions: loaded.widgets, selectedId: loaded.widgets[0].id, kinds: loaded.kinds }
}
</script>

<template>
  <UApp>
    <LoomStudio
      :key="definition.id"
      v-model="definition"
      :kit="kit"
      :samples="samples"
      :context="bridge"
      :library="library.definitions"
      :kinds="library.kinds"
      @publish="publish"
      @import-library="importLibrary"
    >
      <template #actions>
        <USwitch
          :model-value="subscribed"
          label="Subscriber"
          size="sm"
          class="mx-1"
          :title="subscribed ? 'Paywalled samples are unlocked' : 'Paywalled samples are locked: actions on them show the paywall'"
          @update:model-value="native.setSubscribed(!!$event)"
        />
        <USelect
          :model-value="library.selectedId"
          :items="widgetOptions"
          value-key="value"
          :icon="widgetOptions.find((i) => i.value === library.selectedId)?.icon"
          size="sm"
          variant="ghost"
          class="w-44"
          aria-label="Widget"
          @update:model-value="library.selectedId = String($event)"
        />
        <UDropdownMenu
          :items="[
            { label: 'New widget…', icon: 'i-lucide-plus', onSelect: () => (newOpen = true) },
            { type: 'separator' },
            { label: 'New kind…', icon: 'i-lucide-shapes', onSelect: () => (kindEditor = { open: true, kind: undefined, starter: undefined }) },
            {
              label: 'New kind from this widget…',
              icon: 'i-lucide-copy-plus',
              onSelect: () => (kindEditor = { open: true, kind: undefined, starter: definition }),
            },
            ...(editableKind
              ? [
                  {
                    label: `Edit ${editableKind.label}…`,
                    icon: 'i-lucide-pencil',
                    onSelect: () => (kindEditor = { open: true, kind: editableKind, starter: undefined }),
                  },
                ]
              : []),
            { type: 'separator' },
            ...(shadowedBy
              ? [{ label: `Use this one for ${getKind(kit, definition.kind)?.label ?? definition.kind}`, icon: 'i-lucide-eye', onSelect: useForKind }]
              : []),
            {
              label: 'Move earlier',
              icon: 'i-lucide-arrow-up',
              disabled: position <= 0,
              onSelect: () => moveWidget(-1),
            },
            {
              label: 'Move later',
              icon: 'i-lucide-arrow-down',
              disabled: position >= library.definitions.length - 1,
              onSelect: () => moveWidget(1),
            },
            {
              label: 'Delete this widget',
              icon: 'i-lucide-trash-2',
              color: 'error',
              disabled: library.definitions.length < 2,
              onSelect: removeWidget,
            },
            { type: 'separator' },
            { label: 'Back to the examples', icon: 'i-lucide-rotate-ccw', onSelect: () => (library = exampleLibrary()) },
          ]"
        >
          <UButton icon="i-lucide-ellipsis" size="sm" color="neutral" variant="ghost" class="rounded-full" aria-label="Library" />
        </UDropdownMenu>
      </template>
    </LoomStudio>
    <KindModal
      v-model:open="kindEditor.open"
      :kit="kit"
      :samples="samples"
      :kind="kindEditor.kind"
      :starter="kindEditor.starter"
      :in-use="!!kindEditor.kind && library.definitions.some((d) => d.kind === kindEditor.kind.id)"
      @save="saveKind"
      @remove="removeKind"
    />
    <NewWidgetModal v-model:open="newOpen" :kit="kit" :taken-ids="library.definitions.map((d) => d.id)" @create="addWidget" />
  </UApp>
</template>
