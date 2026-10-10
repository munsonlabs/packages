<script>
export const chapter = {
  step: 28,
  title: 'Fix: skip malformed widgets',
  subject: 'fix(loom): skip malformed widgets in a library instead of throwing',
}
</script>

<script setup>
import { loadLibrary } from '@munsonlabs/loom'
import ChapterPage from '../ChapterPage.vue'
import { kit } from '../kit'

const file = {
  format: 'loom-library',
  version: 1,
  widgets: [
    { version: 2, id: 'title-only', name: 'Title only', root: { id: 'title', type: 'Text', bind: { text: 'article.title' } } },
    { version: 2, id: 'half-finished', name: 'Half finished' },
    { note: 'not a widget at all' },
  ],
}
const result = loadLibrary(kit, file)
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom/src/definitions/library.js',
      'packages/loom/test/definitions/library.spec.js',
      'docs/content/05.loom/02.core-concepts/07.libraries.md',
    ]"
  >
    <p>
      <code>loadLibrary</code> validated every entry as if it were a definition, so a library with an entry that has no root (a hand-edited file, or
      one from another tool) threw from inside the validator instead of reporting it.
    </p>
    <p>
      Such entries now land in <code>skipped</code> with “Not a widget definition: it needs a root”, named by their id or their position, and are left
      out of what counts as missing.
    </p>
    <p class="note">Try: the library below has a good widget, an entry with no root, and one with no id either. Before this fix, loading it threw.</p>

    <template #example>
      <p>
        Loaded: <strong>{{ result.widgets.map((w) => w.name).join(', ') }}</strong>
      </p>
      <p v-for="(skip, i) in result.skipped" :key="i">
        Skipped <code>{{ skip.id ?? skip.name ?? `#${i}` }}</code
        >: {{ skip.issues.map((issue) => issue.message).join('; ') }}
      </p>
    </template>
  </ChapterPage>
</template>
