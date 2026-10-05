<script setup lang="ts">
import { ref } from 'vue'
type Todo = { label: string; detail?: string; done: boolean }

const todos = ref<Todo[]>([
  { label: 'Play the source video', done: true },
  { label: 'Choose a region', done: false },
  { label: 'Splice videos', done: false },
  { label: 'Burn in captions', done: true },
  { label: 'Handle or drop the audio', done: true },
  { label: 'Export and download', done: true },
  { label: 'Then the UI', done: false },
])
</script>

<template>
  <h2>The plan!</h2>
  <p>
    Splice is a skeleton for now. The pipeline comes first, the editing surface last, so the checkboxes are my hopes and dreams which I can tick off
    one a time
  </p>

  <ul>
    <li v-for="todo in todos" :key="todo.label">
      <input type="checkbox" :checked="todo.done" disabled :aria-label="todo.label" />
      <span>&nbsp; {{ todo.label }}</span>
    </li>
  </ul>
</template>
