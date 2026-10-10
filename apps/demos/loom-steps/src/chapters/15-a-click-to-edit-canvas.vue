<script>
export const chapter = {
  step: 15,
  title: 'Loom Studio: a click-to-edit canvas',
  subject: 'feat(loom-studio): a click-to-edit canvas',
}
</script>

<script setup>
import { ref } from 'vue'
import { LoomStudio } from '@munsonlabs/loom-studio'
import { registerIcons, timelineKit, widgets } from 'timeline-kit'
import ChapterPage from '../ChapterPage.vue'
import { bridge } from '../bolt'

void registerIcons()

// The studio edits one definition through v-model: here, a copy of the kit's article card.
const definition = ref(structuredClone(widgets[0]))
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom-studio/src/LoomStudio.vue',
      'packages/loom-studio/src/studio.js',
      'packages/loom-studio/src/canvas/',
      'packages/loom-studio/src/panels/inspector/',
      'packages/loom-studio/src/editing/',
      'packages/loom-studio/src/preview/usePreview.js',
      'docs/content/05.loom/03.studio/01.loom-studio.md',
    ]"
  >
    <p>
      <code>@munsonlabs/loom-studio</code> is the editor for loom definitions, built on Nuxt UI, with no sidebars. The widget renders on a dotted
      canvas at a chosen width with sample data; click any element and its editor opens beside it.
    </p>
    <p>
      <code>createStudio</code> wires undo and redo, the selection, tree editing and the preview into one object every part reads with
      <code>useStudio()</code>. From this chapter on the demo uses Nuxt UI, set up the way the studio's README says.
    </p>
    <p class="note">
      Try: click the headline, then bind it to another of the story's values in the Content tab. Use the breadcrumb to reach the card, add a block
      after it, and undo with ⌘Z. Switch the preview width and the sample story in the bars.
    </p>

    <template #example>
      <div class="studio-pane">
        <UApp>
          <LoomStudio v-model="definition" :kit="timelineKit" :samples="bridge.stories" :context="bridge" />
        </UApp>
      </div>
    </template>
  </ChapterPage>
</template>
