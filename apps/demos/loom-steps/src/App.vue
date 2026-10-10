<script setup>
import { computed, onBeforeUnmount, shallowRef } from 'vue'

/**
 * Every chapter in `chapters/`, one per commit so far. Each file says which step it is and what
 * that commit was called, so checking out another commit is all it takes to add or drop one.
 */
const modules = import.meta.glob('./chapters/*.vue', { eager: true })
const chapters = Object.values(modules)
  .map((module) => ({ ...module.chapter, component: module.default }))
  .sort((a, b) => a.step - b.step)
const latest = chapters[chapters.length - 1]

// The chapter on show lives in the URL (#step-3), so a reload or a checkout keeps it. Without one, the latest.
const fromHash = () => chapters.find((c) => `#step-${c.step}` === location.hash) ?? latest
const current = shallowRef(fromHash())
const onHashChange = () => (current.value = fromHash())
window.addEventListener('hashchange', onHashChange)
onBeforeUnmount(() => window.removeEventListener('hashchange', onHashChange))

const title = computed(() => `Step ${current.value.step}: ${current.value.title}`)
</script>

<template>
  <div class="steps">
    <aside class="steps-nav">
      <p class="steps-brand">Loom, step by step</p>
      <nav>
        <a
          v-for="chapter in chapters"
          :key="chapter.step"
          :href="`#step-${chapter.step}`"
          :class="{ 'is-current': chapter === current }"
          :aria-current="chapter === current ? 'page' : undefined"
        >
          <span class="steps-number">{{ chapter.step }}</span>
          <span>{{ chapter.title }}</span>
        </a>
      </nav>
    </aside>

    <main class="steps-main">
      <header class="steps-header">
        Step {{ latest.step }} of the Loom build: <code>{{ latest.subject }}</code>
      </header>
      <article class="steps-chapter">
        <h1>{{ title }}</h1>
        <p class="steps-subject">
          <code>{{ current.subject }}</code>
        </p>
        <component :is="current.component" :key="current.step" />
      </article>
    </main>
  </div>
</template>

<style>
:root {
  --steps-bg: #fafaf9;
  --steps-panel: #ffffff;
  --steps-text: #1c1917;
  --steps-muted: #78716c;
  --steps-line: #e7e5e4;
  --steps-accent: #c2410c;
  --steps-accent-soft: #ffedd5;
  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  :root {
    --steps-bg: #0c0a09;
    --steps-panel: #1c1917;
    --steps-text: #f5f5f4;
    --steps-muted: #a8a29e;
    --steps-line: #292524;
    --steps-accent: #fb923c;
    --steps-accent-soft: #431407;
  }
}

body {
  margin: 0;
  background: var(--steps-bg);
  color: var(--steps-text);
  font:
    15px/1.55 system-ui,
    sans-serif;
}

.steps {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  min-height: 100vh;
}

.steps-nav {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  border-right: 1px solid var(--steps-line);
  background: var(--steps-panel);
  padding: 16px 10px;
  box-sizing: border-box;
}

.steps-brand {
  margin: 0 8px 12px;
  font-weight: 700;
}

.steps-nav nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.steps-nav a {
  display: flex;
  gap: 10px;
  align-items: baseline;
  padding: 6px 8px;
  border-radius: 6px;
  color: inherit;
  text-decoration: none;
  font-size: 14px;
}

.steps-nav a:hover {
  background: var(--steps-bg);
}

.steps-nav a.is-current {
  background: var(--steps-accent-soft);
  color: var(--steps-accent);
  font-weight: 600;
}

.steps-number {
  min-width: 1.6em;
  text-align: right;
  color: var(--steps-muted);
  font-variant-numeric: tabular-nums;
}

.steps-main {
  min-width: 0;
}

.steps-header {
  padding: 10px 24px;
  border-bottom: 1px solid var(--steps-line);
  background: var(--steps-panel);
  color: var(--steps-muted);
  font-size: 13px;
}

.steps-chapter {
  max-width: 960px;
  padding: 24px;
}

.steps-chapter h1 {
  margin: 0;
  font-size: 26px;
  line-height: 1.25;
}

.steps-chapter h2 {
  margin: 28px 0 8px;
  font-size: 17px;
}

.steps-chapter p {
  margin: 0 0 10px;
}

.steps-subject {
  color: var(--steps-muted);
  font-size: 13px;
}

.steps-chapter code {
  font:
    13px ui-monospace,
    monospace;
}

@media (max-width: 720px) {
  .steps {
    grid-template-columns: 1fr;
  }

  .steps-nav {
    position: static;
    height: auto;
    max-height: 40vh;
    border-right: 0;
    border-bottom: 1px solid var(--steps-line);
  }

  .steps-chapter {
    padding: 16px;
  }
}
</style>
