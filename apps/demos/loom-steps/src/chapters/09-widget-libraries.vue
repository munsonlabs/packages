<script>
export const chapter = {
  step: 9,
  title: 'Widget libraries',
  subject: 'feat(loom): widget libraries',
}
</script>

<script setup>
import { computed, ref } from 'vue'
import { createLibrary, loadLibrary, Widget } from '@munsonlabs/loom'
import ChapterPage from '../ChapterPage.vue'
import { articles, kit, notes } from '../kit'

const articleCard = {
  version: 2,
  id: 'article-card',
  name: 'Article card',
  kind: 'article',
  root: { id: 'title', type: 'Text', props: { variant: 'title' }, bind: { text: 'article.title' } },
}
const noteCard = {
  version: 2,
  id: 'note-card',
  name: 'Note card',
  kind: 'note',
  root: { id: 'note', type: 'Box', children: [{ id: 'text', type: 'Text', bind: { text: 'article.title' } }] },
}
// Made by a newer version of the app: this kit has no Video block and no podcast source.
const podcastCard = {
  version: 2,
  id: 'podcast-card',
  name: 'Podcast card',
  kind: 'article',
  root: { id: 'clip', type: 'Video', bind: { src: 'podcast.audio' } },
}

// Publishing: every widget for the kit, in order, in one file.
const text = ref(JSON.stringify(createLibrary(kit, [podcastCard, articleCard, noteCard], { publishedAt: '2026-10-10T09:00:00Z' }), null, 2))

// Loading: keep what renders with this kit, and say what was skipped and why.
const loaded = computed(() => {
  try {
    return loadLibrary(kit, text.value)
  } catch (error) {
    return { error: String(error) }
  }
})
const feed = [articles[0], notes[0], articles[2]]
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom/src/definitions/library.js',
      'packages/loom/src/definitions/paths.js',
      'packages/loom/src/kit/createKit.js',
      'packages/loom/src/index.js',
    ]"
  >
    <p>
      <code>createLibrary</code> bundles every widget for a kit into one file, in order, with the kit's id (new on <code>createKit</code>) and the
      sources and blocks its widgets need. It's what an app would fetch.
    </p>
    <p>
      <code>loadLibrary</code> reads it back, validates each widget against this kit, keeps what renders and reports what it skipped, what the kit
      lacks, and a kit mismatch. It throws only for input that isn't a library, or a format newer than it understands.
    </p>

    <template #example>
      <div class="row">
        <textarea
          v-model="text"
          rows="18"
          spellcheck="false"
          style="
            flex: 1 1 320px;
            font:
              12px ui-monospace,
              monospace;
          "
        />
        <div style="flex: 1 1 280px">
          <p v-if="loaded.error" class="note">{{ loaded.error }}</p>
          <template v-else>
            <p>
              Loaded: <strong>{{ loaded.widgets.map((w) => w.name).join(', ') || 'nothing' }}</strong>
            </p>
            <p v-for="skip in loaded.skipped" :key="skip.id">
              Skipped <strong>{{ skip.name }}</strong
              >: {{ skip.issues.map((i) => i.message).join('; ') }}
            </p>
            <p class="note">This kit lacks: {{ [...loaded.missing.sources, ...loaded.missing.blocks].join(', ') || 'nothing' }}</p>
            <div v-for="item in feed" :key="item.id" class="card" style="margin-top: 8px">
              <Widget :kit="kit" :definitions="loaded.widgets" :data="item" />
            </div>
          </template>
        </div>
      </div>
    </template>
  </ChapterPage>
</template>
