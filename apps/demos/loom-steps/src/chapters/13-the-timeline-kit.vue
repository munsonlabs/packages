<script>
export const chapter = {
  step: 13,
  title: 'The timeline kit',
  subject: 'feat(demos): the timeline kit',
}
</script>

<script setup>
import { computed } from 'vue'
import { Widget } from '@munsonlabs/loom'
import { feedOf, registerIcons, timelineKit, widgets } from 'timeline-kit'
import ChapterPage from '../ChapterPage.vue'
import { bridge, messages, native } from '../bolt'

// The kit's widgets name Lucide icons.
void registerIcons()

/** The stories the app sent, minus the ones that only appear inside another. */
const feed = computed(() => feedOf(bridge.stories))
const subscribed = computed(() => bridge.authorisationStatus.state === 'active')
</script>

<template>
  <ChapterPage
    :files="[
      'apps/demos/timeline-kit/src/index.js',
      'apps/demos/timeline-kit/src/sources/',
      'apps/demos/timeline-kit/src/kinds.js',
      'apps/demos/timeline-kit/src/paywall.js',
      'apps/demos/timeline-kit/src/themes.js',
      'apps/demos/timeline-kit/src/widgets/',
      'apps/demos/timeline-kit/src/feed.js',
      'docs/content/05.loom/04.guides/01.bring-your-composables.md',
    ]"
  >
    <p>
      <code>timeline-kit</code> is Bolt's story timeline as a loom kit, and the real version of this demo's little kit: one file per Bolt-style
      composable with its source beside it, kinds by entry type, light and dark themes that read a publisher's
      <code>--timeline-style-*</code> variables, a paywall guard, example widgets as JSON and a sample feed.
    </p>
    <p>
      Its context is the bridge stub, so every tap goes to the pretend app and comes back as state. From this step on the stub app holds the kit's
      sample feed (<code>src/bolt.js</code>), so the previous chapter shows these stories too.
    </p>

    <template #example>
      <label><input type="checkbox" :checked="subscribed" @change="native.setSubscribed(!subscribed)" /> Subscribed</label>
      <div style="display: grid; gap: 16px; max-width: 560px">
        <Widget
          v-for="(story, i) in feed"
          :key="story.entry.id"
          :kit="timelineKit"
          :definitions="widgets"
          :data="story"
          :index="i"
          :context="bridge"
        />
      </div>
      <pre>{{ messages.join('\n') || 'Save, follow or open a story. Locked ones show the paywall.' }}</pre>
    </template>
  </ChapterPage>
</template>
