<script>
export const chapter = {
  step: 23,
  title: 'A command palette',
  subject: 'feat(loom-studio): a command palette',
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
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom-studio/src/dialogs/CommandPalette.vue',
      'packages/loom-studio/src/bars/DocumentBar.vue',
      'packages/loom-studio/src/editing/tree.js',
      'packages/loom-studio/src/studio.js',
    ]"
  >
    <p>
      ⌘K opens a palette that jumps to any element (hidden ones included), adds a block to the selection, switches the variant being edited, or opens
      the theme, variants, export and import panels and Try mode.
    </p>
    <p>Its actions run after the palette closes, with the modal's focus return suppressed so the element editor doesn't read it as a click away.</p>
    <p class="note">Try: click the studio, press ⌘K (Ctrl K) and type “summary” to jump to it, or “variant” to switch variants.</p>

    <template #example>
      <div class="studio-pane">
        <UApp>
          <LoomStudio v-model="definition" :kit="timelineKit" :samples="bridge.stories" :context="bridge" />
        </UApp>
      </div>
    </template>
  </ChapterPage>
</template>
