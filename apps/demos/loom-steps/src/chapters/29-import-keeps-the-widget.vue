<script>
export const chapter = {
  step: 29,
  title: 'Fix: import keeps the widget',
  subject: 'fix(loom-studio): importing a single widget keeps the identity of the one being edited',
}
</script>

<script setup>
import { ref } from 'vue'
import { LoomStudio } from '@munsonlabs/loom-studio'
import { registerIcons, timelineKit, widgets } from 'timeline-kit'
import ChapterPage from '../ChapterPage.vue'
import { bridge } from '../bolt'

void registerIcons()

const definition = ref(structuredClone(widgets[0]))
const pasted = JSON.stringify(
  {
    version: 2,
    id: 'someone-elses-card',
    name: 'Pasted card',
    kind: 'article',
    root: { id: 'title', type: 'Text', props: { variant: 'title' }, bind: { text: 'story.title' } },
  },
  null,
  2,
)
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom-studio/src/dialogs/parseImport.js',
      'packages/loom-studio/src/dialogs/ImportModal.vue',
      'packages/loom-studio/test/dialogs/parseImport.spec.js',
    ]"
  >
    <p>
      Pasting a widget into Import replaced the definition wholesale, id included, so the app's library (which stores widgets by id) lost track of the
      one open in the studio, and the pasted file quietly became another widget.
    </p>
    <p>
      The paste logic moves into <code>parseImport</code>, which keeps the edited widget's id on a single definition and passes a library through
      untouched, and is tested on its own.
    </p>
    <p class="note">
      Try: copy the widget below (its id is <code>someone-elses-card</code>), open Import in the top bar and paste it. The studio now shows the pasted
      widget, and the id under the studio stays <code>article-card</code>.
    </p>

    <template #example>
      <pre>{{ pasted }}</pre>
      <div class="studio-pane">
        <UApp>
          <LoomStudio v-model="definition" :kit="timelineKit" :samples="bridge.stories" :context="bridge" :tour="false" />
        </UApp>
      </div>
      <p class="note">
        Being edited: <code>{{ definition.id }}</code> ({{ definition.name }})
      </p>
    </template>
  </ChapterPage>
</template>
