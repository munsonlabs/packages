<script>
export const chapter = {
  step: 19,
  title: 'Editing variants',
  subject: 'feat(loom-studio): editing variants',
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
      'packages/loom/src/definitions/variants.js',
      'packages/loom-studio/src/editing/useVariantEditing.js',
      'packages/loom-studio/src/panels/VariantsPanel.vue',
      'packages/loom-studio/src/panels/OverrideMark.vue',
      'packages/loom-studio/src/bars/PreviewBar.vue',
      'packages/loom-studio/src/canvas/ElementPopover.vue',
    ]"
  >
    <p>
      Loom gains <code>diffAsOverride</code>, the smallest override that turns a base node into an edited one. In the studio the bottom bar picks the
      variant being edited: changes become that variant's overrides, with a mark on each changed field that resets it to the base. Moves become the
      parent's order, delete hides, and adding or nesting stay on the base.
    </p>
    <p>
      The variants panel adds, orders and deletes variants and edits their rules and token overrides. Rules lets the preview pick its own variant, a
      banner says which variant is being edited, and issues name theirs.
    </p>
    <p class="note">
      Try: pick the <em>compact</em> variant in the bottom bar and hide the summary: the base keeps it. Open the variants panel to change compact's
      width rule.
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
