<script>
export const chapter = {
  step: 25,
  title: 'A layers panel',
  subject: 'feat(loom-studio): a layers panel',
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
      'packages/loom-studio/src/layers/LayersPanel.vue',
      'packages/loom-studio/src/layers/layers.js',
      'packages/loom-studio/src/bars/DocumentBar.vue',
      'packages/loom-studio/src/LoomStudio.vue',
      'packages/loom-studio/test/layers/layers.spec.js',
    ]"
  >
    <p>
      Layers (in the top bar, or L) opens the widget's tree beside the canvas, one row per element with its icon, label and what it shows. Rows
      select, collapse and drag to move, through the same rules as the canvas, and offer duplicate and delete on the base, or hide and show in a
      variant.
    </p>
    <p>
      Elements that aren't on screen for this sample are marked, so they can still be reached. <code>layers.js</code> holds the pure row and
      drop-position helpers.
    </p>
    <p class="note">
      Try: press L, then select the related stories list: it isn't on screen for this sample story. Drag a row onto the middle of a stack to nest it.
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
