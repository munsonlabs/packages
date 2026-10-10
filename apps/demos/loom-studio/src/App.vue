<script setup>
import { computed, ref, watch } from 'vue'
import { LoomStudio } from '@munsonlabs/loom-studio'
import { useBridge } from 'bolt-bridge-stub'
import { timelineKit as kit, widgets as examples } from 'timeline-kit'
import { native } from './native'

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
</script>

<template>
  <UApp>
    <LoomStudio :key="definition.id" v-model="definition" :kit="kit" :samples="samples" :context="bridge">
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
        <UDropdownMenu :items="[{ label: 'Back to the examples', icon: 'i-lucide-rotate-ccw', onSelect: () => (library = exampleLibrary()) }]">
          <UButton icon="i-lucide-ellipsis" size="sm" color="neutral" variant="ghost" class="rounded-full" aria-label="Library" />
        </UDropdownMenu>
      </template>
    </LoomStudio>
  </UApp>
</template>
