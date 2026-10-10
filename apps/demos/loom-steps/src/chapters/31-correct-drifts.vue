<script>
export const chapter = {
  step: 31,
  title: 'Docs: correct drifts',
  subject: 'docs(loom): correct drifts',
}
</script>

<script setup>
import ChapterPage from '../ChapterPage.vue'
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom/src/README.md',
      'packages/loom/src/definitions/README.md',
      'packages/loom/test/README.md',
      'docs/content/05.loom/02.core-concepts/02.kits-and-sources.md',
      'docs/content/05.loom/02.core-concepts/01.definitions.md',
      'docs/content/05.loom/03.studio/01.loom-studio.md',
      'packages/loom-studio/src/tour/steps.js',
    ]"
  >
    <p>
      Docs only, where they had drifted from the code: <code>tokens</code> comes from <code>@munsonlabs/loom/editor</code>, not the main entry.
      Definitions aren't upgraded or migrated, only checked for their version. Five blocks take children, not two.
    </p>
    <p>
      The studio's Import is paste-only, the file list for <code>DocumentBar</code> includes layers, the tour's publish step puts undo and redo where
      they are, and the <code>createKit</code> table gains <code>id</code> and <code>guard</code>.
    </p>
    <p class="note">Try: read the kits page's <code>createKit</code> table, then compare it with what chapters 9 and 10 used.</p>

    <template #example>
      <ul>
        <li>
          <a href="https://munsonlabs.pages.dev/loom/core-concepts/kits-and-sources" target="_blank" rel="noopener">Kits and sources</a>: the
          <code>createKit</code> table
        </li>
        <li>
          <a href="https://munsonlabs.pages.dev/loom/core-concepts/definitions" target="_blank" rel="noopener">Definitions</a>: versions are checked,
          not migrated
        </li>
        <li><a href="https://munsonlabs.pages.dev/loom/studio/loom-studio" target="_blank" rel="noopener">Loom Studio</a>: Import pastes</li>
        <li>
          In the repo: <code>packages/loom/src/README.md</code>, <code>packages/loom/src/definitions/README.md</code>,
          <code>packages/loom/test/README.md</code>
        </li>
      </ul>
    </template>
  </ChapterPage>
</template>
