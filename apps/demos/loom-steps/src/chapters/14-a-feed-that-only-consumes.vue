<script>
export const chapter = {
  step: 14,
  title: 'A feed that only consumes',
  subject: 'feat(demos): a feed that only consumes loom',
}
</script>

<script setup>
import { computed } from 'vue'
import { createLibrary, loadLibrary, provideKit, Widget } from '@munsonlabs/loom'
import { feedOf, registerIcons, timelineKit, widgets } from 'timeline-kit'
import ChapterPage from '../ChapterPage.vue'
import { bridge } from '../bolt'

void registerIcons()

// What the feed fetches: one library file. Here it's published from the kit's examples on the spot;
// the feed demo bundles the same file, or takes one you import from the studio.
const file = JSON.stringify(createLibrary(timelineKit, widgets))
const library = loadLibrary(timelineKit, file)

// As in a Bolt timeline: one kit, the bridge as every widget's context.
provideKit(timelineKit, bridge)
const feed = computed(() => feedOf(bridge.stories))
</script>

<template>
  <ChapterPage
    :files="[
      'apps/demos/loom-feed/src/App.vue',
      'apps/demos/loom-feed/src/useLibrary.js',
      'apps/demos/loom-feed/src/native.js',
      'apps/demos/loom-feed/public/timeline.library.json',
      'apps/demos/loom-feed/test/library.spec.js',
      'docs/content/05.loom/01.getting-started/03.how-it-fits-together.md',
    ]"
  >
    <p>
      <code>apps/demos/loom-feed</code> is set up like a Bolt timeline: it knows the timeline kit, loads a library file and renders the stories the
      stub app sends over the bridge with <code>&lt;Widget :definitions&gt;</code>. There's no editor in it. Its Bridge panel shows every message both
      ways.
    </p>
    <p>
      “How it fits together” gets its first version in the docs, for the packages and demos so far. Run the feed itself with
      <code>vp run --filter loom-feed-demo dev</code> (port 5195).
    </p>

    <template #example>
      <p class="note">
        {{ library.widgets.length }} widgets loaded, {{ library.skipped.length }} skipped, from a {{ Math.round(file.length / 1024) }} kB library.
      </p>
      <div style="display: grid; gap: 16px; max-width: 560px">
        <Widget v-for="(story, i) in feed" :key="story.entry.id" :definitions="library.widgets" :data="story" :index="i" />
      </div>
    </template>
  </ChapterPage>
</template>
