<script>
export const chapter = {
  step: 10,
  title: 'A kit guard sees every action',
  subject: 'feat(loom): a kit guard sees every action first',
}
</script>

<script setup>
import { Widget } from '@munsonlabs/loom'
import ChapterPage from '../ChapterPage.vue'
import { articles, kit, lockedArticle, reader } from '../kit'

// The widget knows nothing about paywalls; the kit's guard decides.
const card = {
  version: 2,
  id: 'article-card',
  name: 'Article card',
  root: {
    id: 'card',
    type: 'Box',
    props: { border: true },
    on: { click: 'reading.open' },
    children: [
      { id: 'section', type: 'Badge', bind: { text: 'article.section' } },
      { id: 'title', type: 'Text', props: { variant: 'subtitle' }, bind: { text: 'article.title' } },
      {
        id: 'save',
        type: 'Button',
        props: { label: 'Save', activeLabel: 'Saved', variant: 'outline' },
        bind: { active: 'reading.saved' },
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
      'packages/loom/src/types/guard.js',
      'packages/loom/src/kit/createKit.js',
      'packages/loom/src/types/kit.js',
    ]"
  >
    <p>
      <code>createKit</code> takes a <code>guard</code>: one function that sees every action a widget is about to run, with its argument, the node
      tapped and the widget's data, index and context. Returning <code>false</code> stops it, so a paywall lives here once instead of in every widget;
      returning a promise holds the action until it resolves.
    </p>
    <p>A stopped link doesn't navigate either. The demo kit's guard lets anyone save, but only members open a locked article.</p>

    <template #example>
      <label><input v-model="reader.member" type="checkbox" /> I'm a member</label>
      <div class="row">
        <Widget class="card" :kit="kit" :definition="card" :data="articles[0]" :context="reader" />
        <Widget class="card" :kit="kit" :definition="card" :data="lockedArticle" :context="reader" />
      </div>
      <pre>{{ reader.log.length ? reader.log.join('\n') : 'Tap each card.' }}</pre>
    </template>
  </ChapterPage>
</template>
