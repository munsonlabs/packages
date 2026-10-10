<script>
export const chapter = {
  step: 4,
  title: 'All the blocks, and a kit’s own',
  subject: "feat(loom): the rest of the built-in blocks, and a kit's own",
}
</script>

<script setup>
import { Widget } from '@munsonlabs/loom'
import ChapterPage from '../ChapterPage.vue'
import { articles, kit, reader } from '../kit'

const card = {
  version: 2,
  id: 'article-panel',
  name: 'Article panel',
  root: {
    id: 'box',
    type: 'Box',
    props: { border: true, shadow: 'var(--w-shadow-md)' },
    children: [
      {
        id: 'byline',
        type: 'Stack',
        props: { direction: 'row', align: 'center' },
        children: [
          { id: 'avatar', type: 'Avatar', props: { size: 'sm' }, bind: { name: 'article.author' } },
          { id: 'author', type: 'Text', props: { variant: 'caption' }, bind: { text: 'article.author' } },
          { id: 'push', type: 'Spacer', props: { grow: true } },
          { id: 'section', type: 'Badge', bind: { text: 'article.section' } },
        ],
      },
      { id: 'title', type: 'Text', props: { variant: 'subtitle' }, bind: { text: 'article.title' } },
      { id: 'stars', type: 'Rating', props: { showValue: true }, bind: { value: 'article.rating' } },
      { id: 'read', type: 'Progress', props: { label: 'Read so far' }, bind: { value: 'article.progress' } },
      {
        id: 'tags',
        type: 'Repeat',
        props: { layout: 'grid', columns: 3 },
        bind: { items: 'article.tags' },
        children: [{ id: 'tag', type: 'Badge', props: { tone: 'neutral' }, bind: { text: 'item' } }],
      },
      { id: 'rule', type: 'Divider' },
      {
        id: 'foot',
        type: 'Stack',
        props: { direction: 'row', align: 'center', justify: 'space-between' },
        children: [
          // The kit's own block, beside the built-ins.
          { id: 'time', type: 'Highlight', bind: { text: 'article.readTime' } },
          { id: 'open', type: 'Link', props: { text: 'Open it' }, on: { click: 'reading.open' } },
        ],
      },
    ],
  },
}
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom/src/blocks/builtin/',
      'packages/loom/src/kit/createKit.js',
      'packages/loom/src/WidgetNode.vue',
      'packages/loom/src/renderer.js',
      'packages/loom/src/theme/styles.css',
      'apps/demos/loom-steps/src/Highlight.vue',
    ]"
  >
    <p>
      Ten more built-in blocks: Box, Grid and Carousel for layout; Avatar, Link, Badge, Rating, Progress, Divider and Spacer for content. A
      <code>Repeat</code> can now lay its items out as a grid or a carousel.
    </p>
    <p>
      A kit can add blocks of its own: a spec and any Vue component, like this demo's <code>Highlight</code>. Loom gives it the resolved props, a
      <code>w-highlight</code> class and the node's attributes. A Link with an <code>href</code> still navigates alongside its action; without one, it
      only runs the action.
    </p>

    <template #example>
      <div class="row">
        <Widget v-for="article in articles" :key="article.id" class="card" :kit="kit" :definition="card" :data="article" :context="reader" />
      </div>
      <pre>{{ reader.log.length ? reader.log.join('\n') : 'Tap “Open it”.' }}</pre>
    </template>
  </ChapterPage>
</template>
