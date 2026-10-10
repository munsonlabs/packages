<script>
export const chapter = {
  step: 3,
  title: 'Validate definitions',
  subject: 'feat(loom): validate definitions, and list what a node can bind to',
}
</script>

<script setup>
import { computed, ref } from 'vue'
import { validateDefinition } from '@munsonlabs/loom'
import { bindableValues } from '@munsonlabs/loom/editor'
import ChapterPage from '../ChapterPage.vue'
import { kit } from '../kit'

// Three mistakes on purpose: a source field that doesn't exist, a block the kit hasn't got,
// and a value where an action belongs. Fix them in the box and watch the list empty.
const text = ref(
  JSON.stringify(
    {
      version: 2,
      id: 'broken-card',
      name: 'Broken card',
      root: {
        id: 'card',
        type: 'Stack',
        children: [
          { id: 'title', type: 'Text', bind: { text: 'article.headline' } },
          { id: 'clip', type: 'Video' },
          { id: 'save', type: 'Button', on: { click: 'reading.saved' } },
          {
            id: 'tags',
            type: 'Repeat',
            bind: { items: 'article.tags' },
            children: [{ id: 'tag', type: 'Text', bind: { text: 'item' } }],
          },
        ],
      },
    },
    null,
    2,
  ),
)

const parsed = computed(() => {
  try {
    return { definition: JSON.parse(text.value) }
  } catch (error) {
    return { error: String(error) }
  }
})
const issues = computed(() => (parsed.value.definition ? validateDefinition(kit, parsed.value.definition) : []))
// What the Text inside the Repeat could bind to: the item and its position first, then every source.
const bindable = computed(() => (parsed.value.definition ? bindableValues(kit, parsed.value.definition, 'tag') : []))
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom/src/definitions/validate.js',
      'packages/loom/src/definitions/paths.js',
      'packages/loom/src/editor.js',
      'packages/loom/src/kit/lookup.js',
      'packages/loom/src/index.js',
    ]"
  >
    <p>
      <code>validateDefinition(kit, definition)</code> checks a definition against a kit before anything renders: its version, every block, every
      bound value, action and condition. It returns a list of problems, each naming its node.
    </p>
    <p>
      <code>bindableValues</code> lists what one node may bind to, in the order an editor would offer it. It's the first thing in
      <code>@munsonlabs/loom/editor</code>, the entry for helpers only editors need, so apps that only render never load them.
    </p>

    <template #example>
      <div class="row">
        <textarea
          v-model="text"
          rows="22"
          spellcheck="false"
          style="
            flex: 1 1 320px;
            font:
              12px ui-monospace,
              monospace;
          "
        />
        <div style="flex: 1 1 280px">
          <p v-if="parsed.error" class="note">{{ parsed.error }}</p>
          <p v-else-if="!issues.length"><strong>No problems.</strong></p>
          <ul v-else>
            <li v-for="(issue, i) in issues" :key="i">
              <code>{{ issue.nodeId ?? 'definition' }}</code
              >: {{ issue.message }}
            </li>
          </ul>
          <p class="note">The <code>tag</code> node can bind to:</p>
          <pre>{{ bindable.map((o) => `${o.path}  (${o.type})`).join('\n') }}</pre>
        </div>
      </div>
    </template>
  </ChapterPage>
</template>
