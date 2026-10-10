<script>
export const chapter = {
  step: 17,
  title: 'Issues, export and import',
  subject: 'feat(loom-studio): issues, export and import',
}
</script>

<script setup>
import { ref } from 'vue'
import { LoomStudio } from '@munsonlabs/loom-studio'
import { registerIcons, timelineKit, widgets } from 'timeline-kit'
import ChapterPage from '../ChapterPage.vue'
import { bridge } from '../bolt'

void registerIcons()

// One mistake on purpose, for the issues list to find.
const broken = structuredClone(widgets[0])
const fix = (node) => {
  if (node.id === 'title') node.bind = { ...node.bind, text: 'story.headline' }
  node.children?.forEach(fix)
}
fix(broken.root)
const definition = ref(broken)
const published = ref()
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom-studio/src/bars/IssuesPopover.vue',
      'packages/loom-studio/src/bars/DocumentBar.vue',
      'packages/loom-studio/src/dialogs/ExportModal.vue',
      'packages/loom-studio/src/dialogs/ImportModal.vue',
      'packages/loom-studio/src/studio.js',
      'packages/loom-studio/src/LoomStudio.vue',
    ]"
  >
    <p>
      The top bar gains the validator's verdict: a tick, or each problem one click from its element. Export shows the widget's JSON and a usage
      snippet to copy or download; Import pastes a definition over the one being edited, and can be undone.
    </p>
    <p>
      Publish emits the definition, and is disabled while there are errors. Here the card starts with one: its headline binds to
      <code>story.headline</code>, which the kit doesn't have.
    </p>
    <p class="note">
      Try: open the issues in the top bar and click the problem to jump to the headline, then rebind it to <code>story.title</code>. Publish, and the
      JSON shows below.
    </p>

    <template #example>
      <div class="studio-pane">
        <UApp>
          <LoomStudio v-model="definition" :kit="timelineKit" :samples="bridge.stories" :context="bridge" @publish="published = $event" />
        </UApp>
      </div>
      <pre v-if="published">{{ JSON.stringify(published, null, 2) }}</pre>
    </template>
  </ChapterPage>
</template>
