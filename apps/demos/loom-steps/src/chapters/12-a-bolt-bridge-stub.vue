<script>
export const chapter = {
  step: 12,
  title: 'A stub of the Bolt bridge',
  subject: 'feat(demos): a stub of the Bolt bridge and the native app',
}
</script>

<script setup>
import { computed } from 'vue'
import ChapterPage from '../ChapterPage.vue'
import { bridge, messages, native } from '../bolt'

const subscribed = computed(() => bridge.authorisationStatus.state === 'active')
</script>

<template>
  <ChapterPage
    :files="[
      'apps/demos/bolt-bridge-stub/src/bridge.js',
      'apps/demos/bolt-bridge-stub/src/native.js',
      'apps/demos/bolt-bridge-stub/src/vue.js',
      'apps/demos/bolt-bridge-stub/src/types.js',
      'apps/demos/bolt-bridge-stub/README.md',
      'apps/demos/loom-steps/src/bolt.js',
    ]"
  >
    <p>
      Loom's demos are about Bolt timelines, so they need what a Bolt page talks to: <code>bolt-bridge-stub</code> stands in for
      <code>@pugpigbolt/bridge</code> and the native shell behind it, with the same names and flow. No loom yet: this is the app's side.
    </p>
    <p>
      The web asks through a bridge action. The pretend app keeps saved, read, followed, playing and subscribed state, then pings
      <code>pugpigUpdate</code>, and the bridge reads that state back so everything showing it re-renders. Locked stories follow the reader's
      subscription.
    </p>

    <template #example>
      <label><input type="checkbox" :checked="subscribed" @change="native.setSubscribed(!subscribed)" /> Subscribed (the app's own screen)</label>
      <div v-for="(story, i) in bridge.stories" :key="story.entry.id" class="row" style="align-items: center">
        <span style="flex: 1 1 260px">
          {{ story.entry.title }}
          <span class="note">{{ [story.saved && 'saved', story.read && 'read', story.locked && 'locked'].filter(Boolean).join(', ') }}</span>
        </span>
        <button type="button" @click="bridge.setSaved(story, i, !story.saved)">{{ story.saved ? 'Unsave' : 'Save' }}</button>
        <button type="button" @click="bridge.setRead(story, i)">Mark read</button>
      </div>
      <pre>{{ messages.join('\n') }}</pre>
    </template>
  </ChapterPage>
</template>
