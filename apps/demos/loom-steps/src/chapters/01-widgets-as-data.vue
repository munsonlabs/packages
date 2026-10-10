<script>
export const chapter = {
  step: 1,
  title: 'Widgets as data',
  subject: 'feat(loom): widgets as data: a kit of sources, four blocks and <Widget>',
}
</script>

<script setup>
import { Widget } from '@munsonlabs/loom'
import ChapterPage from '../ChapterPage.vue'
import { articles, kit } from '../kit'

// A widget is plain JSON: a tree of blocks whose props bind to what the kit's sources give.
const card = {
  version: 2,
  id: 'article-card',
  name: 'Article card',
  vars: { '--w-accent': '#0f766e' },
  root: {
    id: 'card',
    type: 'Stack',
    children: [
      { id: 'image', type: 'Image', bind: { src: 'article.image', alt: 'article.title' } },
      { id: 'section', type: 'Text', props: { variant: 'kicker' }, bind: { text: 'article.section' } },
      { id: 'title', type: 'Text', props: { variant: 'title' }, bind: { text: 'article.title' } },
      { id: 'summary', type: 'Text', bind: { text: 'article.summary' } },
      { id: 'read', type: 'Button', props: { variant: 'outline' }, bind: { label: 'article.readTime' } },
    ],
  },
}
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom/src/kit/createKit.js',
      'packages/loom/src/Widget.vue',
      'packages/loom/src/WidgetNode.vue',
      'packages/loom/src/renderer.js',
      'packages/loom/src/blocks/builtin/',
      'packages/loom/src/definitions/paths.js',
      'packages/loom/src/theme/styles.css',
    ]"
  >
    <p>
      A widget is a JSON definition: a tree of blocks (Stack, Text, Image, Button) whose props bind to what the app provides. The app provides it as a
      kit of sources, each one of its own composables, made with <code>createKit</code>.
    </p>
    <p>
      <code>&lt;Widget&gt;</code> sets each source up the first time a binding reaches it, then draws the tree node by node with
      <code>&lt;WidgetNode&gt;</code>. A value that's missing, like the third article's summary, draws nothing rather than the prop's default.
    </p>

    <template #example>
      <div class="row">
        <Widget v-for="article in articles" :key="article.id" class="card" :kit="kit" :definition="card" :data="article" />
      </div>
      <pre>{{ JSON.stringify(card, null, 2) }}</pre>
    </template>
  </ChapterPage>
</template>
