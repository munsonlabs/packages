<script>
export const chapter = {
  step: 27,
  title: 'Docs: file by file',
  subject: 'docs(loom): how it fits together, file by file',
}
</script>

<script setup>
import ChapterPage from '../ChapterPage.vue'
</script>

<template>
  <ChapterPage :files="['docs/content/05.loom/01.getting-started/03.how-it-fits-together.md']">
    <p>
      Docs only. The studio's file-by-file table in the getting-started guide now lists every file in <code>packages/loom-studio/src</code>: the
      canvas drag, the call log, the layers panel, the command palette, the library tabs of Export and Import, <code>NewWidgetModal</code> and the
      tour.
    </p>
    <p>Nothing in the code changed, so there's nothing new to run: read the page instead.</p>
    <p class="note">Try: open the page and find a file from an earlier chapter, like <code>canvas/useCanvasDrag.js</code> from step 22.</p>

    <template #example>
      <ul>
        <li>
          <a href="https://munsonlabs.pages.dev/loom/getting-started/how-it-fits-together" target="_blank" rel="noopener">How it fits together</a> on
          the docs site
        </li>
        <li>In the repo: <code>docs/content/05.loom/01.getting-started/03.how-it-fits-together.md</code></li>
      </ul>
    </template>
  </ChapterPage>
</template>
