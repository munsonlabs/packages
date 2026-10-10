<script>
export const chapter = {
  step: 7,
  title: 'Design tokens and themes',
  subject: 'feat(loom): design tokens and themes',
}
</script>

<script setup>
import { ref } from 'vue'
import { Widget } from '@munsonlabs/loom'
import ChapterPage from '../ChapterPage.vue'
import { articles, kit, reader } from '../kit'

const card = {
  version: 2,
  id: 'article-card',
  name: 'Article card',
  root: {
    id: 'box',
    type: 'Box',
    props: { border: true },
    children: [
      { id: 'section', type: 'Badge', bind: { text: 'article.section' } },
      { id: 'title', type: 'Text', props: { variant: 'title' }, bind: { text: 'article.title' } },
      { id: 'summary', type: 'Text', bind: { text: 'article.summary' } },
      {
        id: 'save',
        type: 'Button',
        props: { label: 'Save', activeLabel: 'Saved' },
        bind: { active: 'reading.saved' },
        on: { click: 'reading.toggleSave' },
      },
    ],
  },
}

// The same widget, with its own accent: definition vars sit on top of whichever theme.
const teal = { ...card, id: 'teal-card', vars: { accent: '#0f766e' } }

const theme = ref('light')
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom/src/theme/tokens.js',
      'packages/loom/src/theme/styles.css',
      'packages/loom/src/Widget.vue',
      'packages/loom/src/kit/lookup.js',
      'packages/loom/src/blocks/builtin/',
      'packages/loom/test/theme/tokens.spec.js',
    ]"
  >
    <p>
      Every <code>--w-*</code> variable is now a named design token, in two tiers: scales (colours, type, space, radii, shadows) and roles that point
      at them, like <code>gap</code> or <code>title-size</code>. Blocks read only tokens.
    </p>
    <p>
      A theme is a set of token values. A kit lists its themes (the light theme when it lists none) and <code>&lt;Widget theme&gt;</code>
      picks one. It's written inline on the widget's root, under the definition's vars and the variant's, so a widget can still keep its own accent.
    </p>

    <template #example>
      <label>
        Theme
        <select v-model="theme">
          <option v-for="t in kit.themes" :key="t.id" :value="t.id">{{ t.label }}</option>
        </select>
      </label>
      <div class="row">
        <Widget class="card" :kit="kit" :definition="card" :data="articles[0]" :context="reader" :theme="theme" />
        <Widget class="card" :kit="kit" :definition="teal" :data="articles[1]" :context="reader" :theme="theme" />
      </div>
    </template>
  </ChapterPage>
</template>
