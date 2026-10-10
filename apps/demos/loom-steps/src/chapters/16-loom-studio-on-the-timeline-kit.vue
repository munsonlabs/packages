<script>
export const chapter = {
  step: 16,
  title: 'Loom Studio on the timeline kit',
  subject: 'feat(loom-studio-demo): Loom Studio on the timeline kit',
}
</script>

<script setup>
import { computed, ref } from 'vue'
import { LoomStudio } from '@munsonlabs/loom-studio'
import { registerIcons, timelineKit, widgets } from 'timeline-kit'
import ChapterPage from '../ChapterPage.vue'
import { bridge } from '../bolt'

void registerIcons()

// The app's library: every example widget, and which one is open. The studio edits one at a time.
const library = ref(structuredClone(widgets))
const selectedId = ref(widgets[0].id)
const definition = computed({
  get: () => library.value.find((d) => d.id === selectedId.value),
  set: (next) => (library.value = library.value.map((d) => (d.id === next.id ? next : d))),
})
</script>

<template>
  <ChapterPage
    :files="[
      'apps/demos/loom-studio/src/App.vue',
      'apps/demos/loom-studio/src/main.js',
      'apps/demos/loom-studio/src/native.js',
      'apps/demos/loom-studio/vite.config.js',
      'apps/demos/loom-studio/README.md',
      'docs/content/05.loom/01.getting-started/03.how-it-fits-together.md',
    ]"
  >
    <p>
      <code>apps/demos/loom-studio</code> runs the studio on the timeline kit: the example widgets as a library kept in <code>localStorage</code>, a
      switcher in the identity bar to pick which one to edit, and “Back to the examples” to start over.
    </p>
    <p>
      Previews run against the Bolt bridge and the stub native app, as in the feed demo, and loom and the studio run from source through the kit's
      vite aliases. This chapter does the same in miniature; run the real one with <code>vp run --filter loom-studio-demo dev</code> (port 5189).
    </p>
    <p class="note">Try: pick another widget in the switcher at the top: each keeps its edits while you move between them.</p>

    <template #example>
      <div class="studio-pane">
        <UApp>
          <LoomStudio :key="selectedId" v-model="definition" :kit="timelineKit" :samples="bridge.stories" :context="bridge">
            <template #actions>
              <USelect
                v-model="selectedId"
                :items="library.map((d) => ({ label: d.name, value: d.id }))"
                value-key="value"
                size="sm"
                variant="ghost"
                class="w-44"
              />
            </template>
          </LoomStudio>
        </UApp>
      </div>
    </template>
  </ChapterPage>
</template>
