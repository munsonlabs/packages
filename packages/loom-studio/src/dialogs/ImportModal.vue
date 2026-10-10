<script setup>
import { ref } from 'vue'
import { useStudio } from '../studio'

/** Import: a pasted widget replaces the one being edited. */
const s = useStudio()

const text = ref('')
const error = ref('')

function close() {
  s.open.import = false
  text.value = ''
  error.value = ''
}

function apply() {
  try {
    const single = JSON.parse(text.value)
    if (!single?.root?.id) throw new Error('Not a widget definition: it needs a `root`.')
    s.history.checkpoint(single)
    s.selection.select(undefined)
    close()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}
</script>

<template>
  <UModal v-model:open="s.open.import" title="Import" description="Paste a widget, which replaces this one.">
    <template #body>
      <UTextarea v-model="text" :rows="14" autoresize :maxrows="20" class="w-full font-mono text-xs" placeholder='{ "version": 2, ... }' />
      <p v-if="error" class="mt-2 text-xs text-error">{{ error }}</p>
    </template>
    <template #footer>
      <div class="flex w-full justify-end">
        <UButton label="Import" :disabled="!text.trim()" @click="apply" />
      </div>
    </template>
  </UModal>
</template>
