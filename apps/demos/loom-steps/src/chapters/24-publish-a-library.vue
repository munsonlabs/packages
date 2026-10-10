<script>
export const chapter = {
  step: 24,
  title: 'Publish a library, start from a kind',
  subject: 'feat(loom-studio): publish a library, and start widgets from a kind',
}
</script>

<script setup>
import { computed, ref } from 'vue'
import { createLibrary } from '@munsonlabs/loom'
import { LoomStudio, NewWidgetModal } from '@munsonlabs/loom-studio'
import { registerIcons, timelineKit, widgets } from 'timeline-kit'
import ChapterPage from '../ChapterPage.vue'
import { bridge } from '../bolt'

void registerIcons()

const library = ref(structuredClone(widgets))
const selectedId = ref(widgets[0].id)
const definition = computed({
  get: () => library.value.find((d) => d.id === selectedId.value),
  set: (next) => (library.value = library.value.map((d) => (d.id === next.id ? next : d))),
})

const newOpen = ref(false)
function add(created) {
  library.value = [...library.value, created]
  selectedId.value = created.id
}

// Publishing hands the app one file: the whole library.
const published = ref()
const publish = () => (published.value = createLibrary(timelineKit, library.value, { publishedAt: new Date() }))

// An imported library replaces these widgets with the ones that load.
function importLibrary(loaded) {
  if (!loaded.widgets.length) return
  library.value = loaded.widgets
  selectedId.value = loaded.widgets[0].id
}
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom-studio/src/dialogs/ExportModal.vue',
      'packages/loom-studio/src/dialogs/ImportModal.vue',
      'packages/loom-studio/src/dialogs/NewWidgetModal.vue',
      'packages/loom-studio/src/LoomStudio.vue',
      'packages/loom-studio/src/index.js',
      'apps/demos/loom-studio/src/App.vue',
      'docs/content/05.loom/02.core-concepts/07.libraries.md',
    ]"
  >
    <p>
      <code>LoomStudio</code> takes <code>library</code>, every widget in the app in order, and Export gains a Whole library tab that lists them with
      what they need from the app and downloads <code>&lt;kit id&gt;.library.json</code>. Import takes a library too: it's checked against the kit
      with <code>loadLibrary</code> and handed to the app through <code>importLibrary</code>, since adding to a library is the app's job.
    </p>
    <p>
      <code>NewWidgetModal</code>, the package's second export, starts a widget from one of the kit's kinds. The studio demo gets Publish, New widget,
      Delete and library import; so does this chapter, in small.
    </p>
    <p class="note">
      Try: open Export and its Whole library tab. Press New widget, pick the Event kind, and it opens in the studio. Publish shows the library below.
    </p>

    <template #example>
      <div class="studio-pane">
        <UApp>
          <LoomStudio
            :key="selectedId"
            v-model="definition"
            :kit="timelineKit"
            :samples="bridge.stories"
            :context="bridge"
            :library="library"
            @publish="publish"
            @import-library="importLibrary"
          >
            <template #actions>
              <USelect
                v-model="selectedId"
                :items="library.map((d) => ({ label: d.name, value: d.id }))"
                value-key="value"
                size="sm"
                variant="ghost"
                class="w-44"
              />
              <UButton icon="i-lucide-plus" size="sm" color="neutral" variant="ghost" label="New widget" @click="newOpen = true" />
            </template>
          </LoomStudio>
          <NewWidgetModal v-model:open="newOpen" :kit="timelineKit" :taken-ids="library.map((d) => d.id)" @create="add" />
        </UApp>
      </div>
      <pre v-if="published">{{ JSON.stringify({ ...published, widgets: published.widgets.map((w) => w.name) }, null, 2) }}</pre>
    </template>
  </ChapterPage>
</template>
