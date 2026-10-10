<script>
export const chapter = {
  step: 2,
  title: 'Actions, conditions and Repeat',
  subject: 'feat(loom): actions, conditions and Repeat',
}
</script>

<script setup>
import { Widget } from '@munsonlabs/loom'
import ChapterPage from '../ChapterPage.vue'
import { articles, kit, reader } from '../kit'

const card = {
  version: 2,
  id: 'article-card',
  name: 'Article card',
  root: {
    id: 'card',
    type: 'Stack',
    // Tapping the card opens the article.
    on: { click: 'reading.open' },
    children: [
      { id: 'title', type: 'Text', props: { variant: 'title' }, bind: { text: 'article.title' } },
      // Only there when the article is saved.
      { id: 'saved', type: 'Text', props: { variant: 'caption', text: 'Saved for later' }, if: 'reading.saved' },
      {
        id: 'tags',
        type: 'Repeat',
        props: { direction: 'row' },
        bind: { items: 'article.tags' },
        // Once per tag, with the tag as `item` and its position as `repeat`.
        children: [{ id: 'tag', type: 'Text', props: { variant: 'kicker', prefix: '#' }, bind: { text: 'item' } }],
      },
      {
        id: 'save',
        type: 'Button',
        props: { label: 'Save', activeLabel: 'Saved', variant: 'outline' },
        bind: { active: 'reading.saved' },
        // Its own action; the card's doesn't run as well.
        on: { click: 'reading.toggleSave' },
      },
    ],
  },
}
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom/src/renderer.js',
      'packages/loom/src/WidgetNode.vue',
      'packages/loom/src/blocks/builtin/Repeat.vue',
      'packages/loom/src/definitions/paths.js',
      'packages/loom/src/types/definition.js',
    ]"
  >
    <p>
      Nodes can now do things. <code>on</code> binds an event to an action a source provides, and <code>if</code> shows a node only while a value is
      truthy (<code>!</code> negates it). A tap on a node stops there, so the Save button inside a tappable card doesn't open it too.
    </p>
    <p>
      <code>Repeat</code> draws its children once per item of a list, with <code>item</code> and <code>repeat</code> (its position) in scope. Those
      two ids are reserved: no source may use them.
    </p>

    <template #example>
      <div class="row">
        <Widget
          v-for="article in articles.slice(0, 2)"
          :key="article.id"
          class="card"
          :kit="kit"
          :definition="card"
          :data="article"
          :context="reader"
        />
      </div>
      <pre>{{ reader.log.length ? reader.log.join('\n') : 'Tap a card, or Save.' }}</pre>
    </template>
  </ChapterPage>
</template>
