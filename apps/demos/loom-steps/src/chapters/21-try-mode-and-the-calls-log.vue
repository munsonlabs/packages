<script>
export const chapter = {
  step: 21,
  title: 'Try mode and the calls log',
  subject: 'feat(loom-studio): Try mode and the calls log',
}
</script>

<script setup>
import { computed, ref } from 'vue'
import { LoomStudio } from '@munsonlabs/loom-studio'
import { registerIcons, timelineKit, widgets } from 'timeline-kit'
import ChapterPage from '../ChapterPage.vue'
import { bridge, native } from '../bolt'

void registerIcons()

const definition = ref(structuredClone(widgets[0]))

// Plays the app's part: the reader subscribes, and every paywalled sample unlocks.
const subscribed = computed(() => bridge.authorisationStatus.state === 'active')
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom-studio/src/preview/logCalls.js',
      'packages/loom-studio/src/preview/useCallLog.js',
      'packages/loom-studio/src/bars/CallsLog.vue',
      'packages/loom-studio/src/bars/PreviewBar.vue',
      'packages/loom-studio/src/canvas/StudioCanvas.vue',
      'apps/demos/loom-studio/src/App.vue',
    ]"
  >
    <p>
      Try switches the canvas from selecting to running the widget's actions against the app's context. The context is wrapped (<code>logCalls</code>)
      so every function a widget calls on it is logged, however deep, and still runs.
    </p>
    <p>
      The calls log shows the last calls bottom left, with a toast for what one click asked of the app. The studio demo adds a Subscriber switch that
      plays the native app's part, locking and unlocking the paywalled samples; so does this chapter.
    </p>
    <p class="note">
      Try: press Try, then tap Save on the card and watch the call reach the bridge. Pick a locked sample story, untick Subscriber, and tap again: the
      guard shows the paywall instead.
    </p>

    <template #example>
      <div class="studio-pane">
        <UApp>
          <LoomStudio v-model="definition" :kit="timelineKit" :samples="bridge.stories" :context="bridge">
            <template #actions>
              <USwitch :model-value="subscribed" label="Subscriber" size="sm" class="mx-1" @update:model-value="native.setSubscribed(!!$event)" />
            </template>
          </LoomStudio>
        </UApp>
      </div>
    </template>
  </ChapterPage>
</template>
