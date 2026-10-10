<script>
export const chapter = {
  step: 20,
  title: 'Light and dark in the studio',
  subject: 'feat(loom-studio): light and dark in the studio',
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
      'packages/loom-studio/src/bars/PreviewBar.vue',
      'packages/loom-studio/src/panels/TokenInput.vue',
      'packages/loom-studio/src/panels/TokensEditor.vue',
      'packages/loom-studio/src/bars/IssuesPopover.vue',
      'packages/loom-studio/src/bars/DocumentBar.vue',
      'packages/loom-studio/src/preview/usePreview.js',
    ]"
  >
    <p>
      The preview's sun and moon show the widget in either scheme or follow the device, switching to the theme's dark counterpart. Any colour field
      gets a moon that splits it into a light and a dark value, written as CSS <code>light-dark()</code>, and the theme panel shows each colour's dark
      value beside the light one.
    </p>
    <p>
      Variant rules can pick on scheme. The issues popover tells warnings (a colour that won't follow dark mode) from errors, with one click to mark
      the widget's colours as deliberate. The studio has its own appearance toggle too.
    </p>
    <p class="note">
      Try: flip the preview to dark with the moon in the bottom bar. Give the card a background colour, see the warning, then split it with the moon
      into a light and a dark value.
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
