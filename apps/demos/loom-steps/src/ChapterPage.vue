<script setup>
/**
 * The layout every chapter shares: what's new (the default slot), the files to read, and a live
 * example (the `example` slot).
 */
defineProps({
  /** Paths from the repo root: what this step added or changed. */
  files: { type: Array, required: true },
})
</script>

<template>
  <section>
    <h2>What's new</h2>
    <slot />
  </section>

  <section>
    <h2>Read these files</h2>
    <ul class="chapter-files">
      <li v-for="file in files" :key="file">
        <code>{{ file }}</code>
      </li>
    </ul>
  </section>

  <section>
    <h2>Try it</h2>
    <div class="chapter-example">
      <slot name="example" />
    </div>
  </section>
</template>

<style>
.chapter-files {
  margin: 0;
  padding-left: 20px;
  list-style: disc;
}

.chapter-example {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--steps-line);
  border-radius: 10px;
  background: var(--steps-panel);
}

/* Small pieces the examples share. */
.chapter-example .row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
}

.chapter-example .card {
  width: 300px;
  max-width: 100%;
}

.chapter-example pre {
  margin: 0;
  max-height: 320px;
  overflow: auto;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--steps-bg);
  font:
    12px/1.5 ui-monospace,
    monospace;
  white-space: pre-wrap;
}

.chapter-example button,
.chapter-example select {
  padding: 4px 10px;
  border: 1px solid var(--steps-line);
  border-radius: 6px;
  background: var(--steps-bg);
  color: inherit;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.chapter-example label {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.chapter-example .note {
  color: var(--steps-muted);
  font-size: 13px;
}
</style>
