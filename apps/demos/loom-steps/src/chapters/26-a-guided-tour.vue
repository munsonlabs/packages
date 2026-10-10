<script>
export const chapter = {
  step: 26,
  title: 'A guided tour',
  subject: 'feat(loom-studio): a guided tour',
}
</script>

<script setup>
import { ref } from 'vue'
import { LoomStudio } from '@munsonlabs/loom-studio'
import { registerIcons, timelineKit, widgets } from 'timeline-kit'
import ChapterPage from '../ChapterPage.vue'
import { bridge } from '../bolt'

void registerIcons()

const definition = ref(structuredClone(widgets[1]))
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom-studio/src/tour/useStudioTour.js',
      'packages/loom-studio/src/tour/steps.js',
      'packages/loom-studio/src/tour/TourPopover.vue',
      'packages/loom-studio/src/LoomStudio.vue',
      'packages/loom-studio/src/studio.js',
    ]"
  >
    <p>
      A tour runs the first time someone opens the studio, remembered per browser, and again from the ? button in the top bar. It runs over the real
      UI on the person's own widget: steps select an element so its editor is there to point at, close it again, and ring each control as they explain
      it.
    </p>
    <p>
      The bars carry <code>data-tour</code> markers, and the tour uses Nuxt UI's <code>useTour</code>. Pass <code>:tour="false"</code> to stop it
      starting on its own. From this step on it also starts, once, in whichever studio chapter you open first.
    </p>
    <p class="note">Try: if the tour didn't start by itself, press ? in the top bar.</p>

    <template #example>
      <div class="studio-pane">
        <UApp>
          <LoomStudio v-model="definition" :kit="timelineKit" :samples="bridge.stories" :context="bridge" />
        </UApp>
      </div>
    </template>
  </ChapterPage>
</template>
