<script>
export const chapter = {
  step: 18,
  title: 'Token pickers, styles and themes',
  subject: 'feat(loom-studio): token pickers, the style tab and the theme panel',
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
      'packages/loom-studio/src/panels/TokenInput.vue',
      'packages/loom-studio/src/panels/StyleEditor.vue',
      'packages/loom-studio/src/panels/inspector/StyleTab.vue',
      'packages/loom-studio/src/panels/TokensEditor.vue',
      'packages/loom-studio/src/bars/ThemePopover.vue',
      'packages/loom-studio/src/bars/PreviewBar.vue',
    ]"
  >
    <p>
      Values that take a token scale pick from it: <code>TokenInput</code> offers the roles and steps of a scale, with a custom value always
      available. <code>StyleEditor</code> edits an element's CSS property by property, behind a new Style tab.
    </p>
    <p>
      The theme panel lists every design token over the kit's theme, with this widget's overrides and a reset for each, plus any custom variables.
      With more than one theme in the kit, the bottom bar previews each.
    </p>
    <p class="note">
      Try: select the card and change its gap from the space scale; open the theme panel in the top bar and give the widget its own accent; preview it
      in the kit's other theme from the bottom bar.
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
