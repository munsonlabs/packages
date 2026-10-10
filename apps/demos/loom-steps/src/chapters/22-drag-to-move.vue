<script>
export const chapter = {
  step: 22,
  title: 'Drag to move',
  subject: 'feat(loom-studio): drag elements on the canvas to move them',
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
      'packages/loom-studio/src/canvas/useCanvasDrag.js',
      'packages/loom-studio/src/canvas/StudioCanvas.vue',
      'packages/loom-studio/src/editing/tree.js',
      'packages/loom-studio/src/editing/useTreeEditing.js',
      'packages/loom-studio/src/studio.js',
    ]"
  >
    <p>
      <code>useCanvasDrag</code> works on loom's own DOM: a press past a few pixels on a <code>[data-node-id]</code> element becomes a drag, the
      element under the pointer is the target, and where the pointer sits in it decides before, after or inside. The canvas draws a line or a box
      where the drop would land.
    </p>
    <p>
      On the base a drop can move a node anywhere; in a variant it only reorders siblings, saved as the parent's order. The click that ends a drag is
      swallowed, so it doesn't reselect.
    </p>
    <p class="note">Try: drag the image below the headline, or into the copy stack. Then pick a variant and drag again: only siblings reorder.</p>

    <template #example>
      <div class="studio-pane">
        <UApp>
          <LoomStudio v-model="definition" :kit="timelineKit" :samples="bridge.stories" :context="bridge" />
        </UApp>
      </div>
    </template>
  </ChapterPage>
</template>
