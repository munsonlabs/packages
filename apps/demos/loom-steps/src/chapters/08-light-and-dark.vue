<script>
export const chapter = {
  step: 8,
  title: 'Light and dark',
  subject: 'feat(loom): light and dark',
}
</script>

<script setup>
import { ref } from 'vue'
import { lightDark, validateDefinition, Widget } from '@munsonlabs/loom'
import ChapterPage from '../ChapterPage.vue'
import { articles, kit } from '../kit'

const card = (id, surface) => ({
  version: 2,
  id,
  name: id,
  vars: { '--w-surface': surface },
  root: {
    id: 'box',
    type: 'Box',
    children: [
      { id: 'section', type: 'Text', props: { variant: 'kicker' }, bind: { text: 'article.section' } },
      { id: 'title', type: 'Text', props: { variant: 'title' }, bind: { text: 'article.title' } },
      { id: 'dark-only', type: 'Text', props: { variant: 'caption', text: 'Shown in the dark only' } },
    ],
  },
  // A variant can target a scheme too: here, the caption only shows in the dark.
  variants: [{ id: 'light', label: 'Light', when: { scheme: 'light' }, overrides: { 'dark-only': { hidden: true } } }],
})

// One pins a pale yellow; the other gives the dark half too, with CSS's light-dark().
const pinned = card('pinned', '#fef3c7')
const paired = card('paired', lightDark('#fef3c7', '#422006'))

const scheme = ref('auto')
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom/src/theme/scheme.js',
      'packages/loom/src/theme/lightDark.js',
      'packages/loom/src/theme/tokens.js',
      'packages/loom/src/Widget.vue',
      'packages/loom/src/definitions/validate.js',
      'packages/loom/src/definitions/variants.js',
    ]"
  >
    <p>
      A light theme can name its dark partner, and <code>darkTheme</code> is built in, paired with <code>lightTheme</code>. With
      <code>scheme="auto"</code> (the default) a widget follows the device through one shared media query; the host can force <code>light</code> or
      <code>dark</code> instead. The root sets <code>color-scheme</code>, so <code>light-dark()</code> values work inside, and variants can target a
      scheme.
    </p>
    <p>
      <code>validateDefinition</code> now warns, with <code>severity: 'warning'</code>, when a widget pins a colour its dark theme would change.
      <code>hasErrors</code> ignores warnings, and <code>fixedColors</code> says the colours are deliberate.
    </p>

    <template #example>
      <div class="row" style="align-items: center">
        <label v-for="option in ['auto', 'light', 'dark']" :key="option">
          <input v-model="scheme" type="radio" :value="option" />
          {{ option }}
        </label>
      </div>
      <div class="row">
        <div v-for="definition in [pinned, paired]" :key="definition.id" class="card">
          <Widget :kit="kit" :definition="definition" :data="articles[0]" :scheme="scheme" />
          <p class="note">
            <code>{{ definition.id }}</code
            >:
            {{
              validateDefinition(kit, definition)
                .map((issue) => issue.message)
                .join(' ') || 'no warnings'
            }}
          </p>
        </div>
      </div>
    </template>
  </ChapterPage>
</template>
