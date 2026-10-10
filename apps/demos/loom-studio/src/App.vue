<script setup>
import { computed, ref, watch } from 'vue'
import { createLibrary } from '@munsonlabs/loom'
import { LoomStudio, NewWidgetModal } from '@munsonlabs/loom-studio'
import { useToast } from '@nuxt/ui/composables'
import { useBridge } from 'bolt-bridge-stub'
import { timelineKit as kit, widgets as examples } from 'timeline-kit'
import { native } from './native'

/** Where the feed demo runs, which renders a published library. */
const FEED_URL = 'http://localhost:5195'
const STORAGE_KEY = 'loom-studio-demo:library'

/**
 * What the studio edits: every widget in the app's library, and which one is open.
 *
 * @typedef {object} Library
 * @property {WidgetDefinition[]} definitions
 * @property {string} selectedId
 */

const exampleLibrary = () => ({ definitions: structuredClone(examples), selectedId: examples[0].id })

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

const widgetOptions = computed(() => library.value.definitions.map((d) => ({ label: d.name, value: d.id })))

const newOpen = ref(false)

function addWidget(created) {
  library.value.definitions = [...library.value.definitions, created]
  library.value.selectedId = created.id
}

function removeWidget() {
  if (library.value.definitions.length < 2) return
  library.value.definitions = library.value.definitions.filter((d) => d.id !== library.value.selectedId)
  library.value.selectedId = library.value.definitions[0].id
}

const toast = useToast()

/** Publishing hands the app one file: the whole library. Here that's a download the feed demo can import. */
function publish() {
  const file = `${kit.id}.library.json`
  const json = JSON.stringify(createLibrary(kit, library.value.definitions, { publishedAt: new Date() }), null, 2)
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

/** An imported library replaces these widgets with the ones that load. */
function importLibrary(loaded) {
  if (loaded.widgets.length) library.value = { definitions: loaded.widgets, selectedId: loaded.widgets[0].id }
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
          size="sm"
          variant="ghost"
          class="w-44"
          aria-label="Widget"
          @update:model-value="library.selectedId = String($event)"
        />
        <UDropdownMenu
          :items="[
            { label: 'New widget…', icon: 'i-lucide-plus', onSelect: () => (newOpen = true) },
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
    <NewWidgetModal
      v-model:open="newOpen"
      :kit="kit"
      :widgets="library.definitions"
      :taken-ids="library.definitions.map((d) => d.id)"
      @create="addWidget"
    />
  </UApp>
</template>
