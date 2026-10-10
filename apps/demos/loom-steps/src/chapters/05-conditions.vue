<script>
export const chapter = {
  step: 5,
  title: 'Conditions pick the widget',
  subject: 'feat(loom): conditions pick the widget for the data',
}
</script>

<script setup>
import { matchDefinition, Widget } from '@munsonlabs/loom'
import { bindableValues } from '@munsonlabs/loom/editor'
import ChapterPage from '../ChapterPage.vue'
import { articles, kit, notes } from '../kit'

// One feed, three kinds of data: articles, a note, and a poll no widget is for.
const feed = [articles[0], notes[0], { id: 'which-loaf', kind: 'poll', title: 'Which loaf should we bake next?' }, articles[1]]

// Two widgets, each saying which data it's for and which composables it uses. <Widget :definitions> picks the first that matches.
const definitions = [
  {
    version: 2,
    id: 'article-card',
    name: 'Article card',
    match: [{ path: 'kind', op: 'equals', value: 'article' }],
    uses: ['article', 'reading'],
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
    match: [{ path: 'kind', op: 'equals', value: 'note' }],
    uses: ['article'],
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

// The note card only uses `article`, so that's all an editor offers its nodes.
const noteSources = [...new Set(bindableValues(kit, definitions[1], 'text').map((o) => o.source))]
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom/src/definitions/match.js',
      'packages/loom/src/Widget.vue',
      'packages/loom/src/types/definition.js',
      'packages/loom/src/definitions/paths.js',
      'packages/loom/src/definitions/validate.js',
    ]"
  >
    <p>
      A definition says which data it's for in <code>match</code>: conditions on the raw data (<code>kind is article</code>), every one of which must
      hold. They're JSON like the rest of it, so an editor can write them and a library can carry them. No conditions means any data.
    </p>
    <p>
      Hand <code>&lt;Widget&gt;</code> a list with <code>:definitions</code> and it draws the first one that matches, or its
      <code>fallback</code> slot when none does. <code>matchDefinition</code> does the same outside a render. A definition's <code>uses</code> lists
      the sources it binds to: editors offer only those, and binding to another is out of scope.
    </p>

    <template #example>
      <div class="row" style="flex-direction: column">
        <div v-for="item in feed" :key="item.id" class="row" style="align-items: center">
          <code style="width: 110px">{{ matchDefinition(item, definitions)?.id ?? 'no widget' }}</code>
          <div class="card">
            <Widget :kit="kit" :definitions="definitions" :data="item">
              <template #fallback="{ data }">
                <p class="note">No widget for “{{ data.title }}”.</p>
              </template>
            </Widget>
          </div>
        </div>
      </div>
      <p class="note">
        The note card can bind to: <code>{{ noteSources.join(', ') }}</code>
      </p>
    </template>
  </ChapterPage>
</template>
