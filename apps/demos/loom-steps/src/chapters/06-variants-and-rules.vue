<script>
export const chapter = {
  step: 6,
  title: 'Variants and rules',
  subject: 'feat(loom): variants and rules',
}
</script>

<script setup>
import { ref } from 'vue'
import { Widget } from '@munsonlabs/loom'
import ChapterPage from '../ChapterPage.vue'
import { articles, kit } from '../kit'

const card = {
  version: 2,
  id: 'article-card',
  name: 'Article card',
  root: {
    id: 'card',
    type: 'Stack',
    children: [
      { id: 'image', type: 'Image', bind: { src: 'article.image', alt: 'article.title' } },
      {
        id: 'copy',
        type: 'Stack',
        children: [
          { id: 'section', type: 'Text', props: { variant: 'kicker' }, bind: { text: 'article.section' } },
          { id: 'title', type: 'Text', props: { variant: 'title' }, bind: { text: 'article.title' } },
          { id: 'summary', type: 'Text', bind: { text: 'article.summary' } },
        ],
      },
    ],
  },
  // Each variant is a diff on the tree above, by node id, and a rule that picks it.
  variants: [
    {
      id: 'wide',
      label: 'Wide',
      when: { size: ['lg'] },
      overrides: { card: { props: { direction: 'row' } }, image: { style: { flex: '0 0 45%' } } },
    },
    {
      id: 'narrow',
      label: 'Narrow',
      when: { size: ['sm'] },
      overrides: { image: { hidden: true }, summary: { hidden: true }, title: { props: { variant: 'subtitle' } } },
    },
  ],
}

const width = ref(420)
const pinned = ref('')
const active = ref('base')
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom/src/definitions/variants.js',
      'packages/loom/src/Widget.vue',
      'packages/loom/src/definitions/validate.js',
      'packages/loom/src/types/definition.js',
    ]"
  >
    <p>
      A variant is a diff on the base tree, keyed by node id: it can change props, bindings and styles, hide nodes or reorder siblings, and it never
      touches the base. Its rule picks it from the data (<code>if</code>) or from the widget's own measured width (<code>size</code>,
      <code>minWidth</code>, <code>maxWidth</code>).
    </p>
    <p>
      <code>&lt;Widget&gt;</code> measures itself, applies the first variant that matches, and emits the one it drew. The <code>variant</code> prop
      pins one instead.
    </p>

    <template #example>
      <div class="row" style="align-items: center">
        <label>Width <input v-model.number="width" type="range" min="200" max="640" /> {{ width }}px</label>
        <label>
          Variant
          <select v-model="pinned">
            <option value="">by the rules</option>
            <option value="base">base</option>
            <option value="wide">wide</option>
            <option value="narrow">narrow</option>
          </select>
        </label>
        <span class="note"
          >Drawing: <strong>{{ active }}</strong></span
        >
      </div>
      <div :style="{ width: `${width}px`, maxWidth: '100%' }">
        <Widget :kit="kit" :definition="card" :data="articles[0]" :variant="pinned || undefined" @variant="active = $event" />
      </div>
    </template>
  </ChapterPage>
</template>
