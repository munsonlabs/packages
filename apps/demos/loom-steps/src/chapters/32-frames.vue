<script>
export const chapter = {
  step: 32,
  title: 'Frames side by side',
  subject: 'feat(loom-studio): frames side by side',
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
      'packages/loom-studio/src/preview/frames.js',
      'packages/loom-studio/src/canvas/StudioCanvas.vue',
      'packages/loom-studio/src/studio.js',
      'packages/loom-studio/src/bars/PreviewBar.vue',
      'packages/loom-studio/test/preview/frames.spec.js',
    ]"
  >
    <p>
      One card left most of the canvas empty. <strong>Frames</strong> (bottom bar, or F) fill it with the same widget side by side: one frame per
      width, per variant, per sample, or light and dark. Each frame is a plain <code>&lt;Widget&gt;</code> with one setting changed;
      <code>frames.js</code> works out the list.
    </p>
    <p>
      The frame marked <em>editing</em> is where the popover opens and drags land. Clicking into another switches the bottom bar to its width,
      variant, sample or scheme first. Frames share node ids, so the selection is outlined in all of them, and every edit shows everywhere.
    </p>
    <p class="note">Try: press F until it says Variants, then click the headline in the Compact frame and change its style.</p>

    <template #example>
      <div class="studio-pane">
        <UApp>
          <LoomStudio v-model="definition" :kit="timelineKit" :samples="bridge.stories" :context="bridge" :tour="false" />
        </UApp>
      </div>
    </template>
  </ChapterPage>
</template>
