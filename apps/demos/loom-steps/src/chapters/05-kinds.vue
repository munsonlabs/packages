<script>
export const chapter = {
  step: 5,
  title: 'Kinds pick the widget',
  subject: 'feat(loom): kinds pick the widget for the data',
}
</script>

<script setup>
import { matchKind, Widget } from '@munsonlabs/loom'
import { createDefinition } from '@munsonlabs/loom/editor'
import ChapterPage from '../ChapterPage.vue'
import { articles, kit, notes } from '../kit'

// One feed, three kinds of data: articles, a note, and a poll no kind matches.
const feed = [articles[0], notes[0], { id: 'which-loaf', kind: 'poll', title: 'Which loaf should we bake next?' }, articles[1]]

// Two widgets, each for one kind. <Widget :definitions> picks the first whose kind matches.
const definitions = [
  {
    version: 2,
    id: 'article-card',
    name: 'Article card',
    kind: 'article',
    root: {
      id: 'card',
      type: 'Stack',
      children: [
        { id: 'section', type: 'Text', props: { variant: 'kicker' }, bind: { text: 'article.section' } },
        { id: 'title', type: 'Text', props: { variant: 'title' }, bind: { text: 'article.title' } },
      ],
    },
  },
  {
    version: 2,
    id: 'note-card',
    name: 'Note card',
    kind: 'note',
    root: {
      id: 'note',
      type: 'Box',
      props: { background: '#fef9c3' },
      children: [
        { id: 'text', type: 'Text', bind: { text: 'article.title' } },
        { id: 'by', type: 'Text', props: { variant: 'caption', prefix: '— ' }, bind: { text: 'article.author' } },
      ],
    },
  },
]

// A new widget starts from its kind's starter.
const fresh = createDefinition(kit, 'note', { id: 'new-note', name: 'New note' })
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom/src/kit/lookup.js',
      'packages/loom/src/kit/createKit.js',
      'packages/loom/src/Widget.vue',
      'packages/loom/src/types/kit.js',
      'packages/loom/src/definitions/paths.js',
    ]"
  >
    <p>
      A kind names a kind of data (an article, a note), says how to recognise it, and gives the starting tree for a new widget of that kind. A
      definition says which kind it's for.
    </p>
    <p>
      Hand <code>&lt;Widget&gt;</code> a list with <code>:definitions</code> and it draws the first one whose kind matches the data, or its
      <code>fallback</code> slot when none does. <code>matchKind</code>, <code>matchDefinition</code> and <code>createDefinition</code> do the same
      lookups outside a render.
    </p>

    <template #example>
      <div class="row" style="flex-direction: column">
        <div v-for="item in feed" :key="item.id" class="row" style="align-items: center">
          <code style="width: 90px">{{ matchKind(kit, item)?.id ?? 'no kind' }}</code>
          <div class="card">
            <Widget :kit="kit" :definitions="definitions" :data="item">
              <template #fallback="{ data }">
                <p class="note">No widget for “{{ data.title }}”.</p>
              </template>
            </Widget>
          </div>
        </div>
      </div>
      <p class="note">A new note widget, from the kind's starter:</p>
      <pre>{{ JSON.stringify(fresh, null, 2) }}</pre>
    </template>
  </ChapterPage>
</template>
