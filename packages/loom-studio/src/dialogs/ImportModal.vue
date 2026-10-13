<script setup>
import { ref } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import { loadLibrary } from '@munsonlabs/loom'
import { useStudio } from '../studio'
import { parseImport } from './parseImport'

/** Import: a single widget replaces the one being edited (keeping its id); a whole library goes to the app (`importLibrary`). */
const s = useStudio()
const toast = useToast()

const text = ref('')
const error = ref('')

function close() {
  s.open.import = false
  text.value = ''
  error.value = ''
}

function apply() {
  try {
    const imported = parseImport(text.value, s.definition.id)
    if (imported.kind === 'library') {
      const loaded = loadLibrary(s.props.kit, imported.data)
      s.importLibrary(loaded)
      toast.add({
        title: `Imported ${loaded.widgets.length} widget${loaded.widgets.length === 1 ? '' : 's'}`,
        description:
          [
            loaded.skippedKinds.length ? `Skipped the kinds ${loaded.skippedKinds.map((x) => x.id).join(', ')}: they don't fit this kit.` : '',
            loaded.skipped.length ? `Skipped ${loaded.skipped.map((x) => x.name ?? x.id).join(', ')}: they won't render with this kit.` : '',
          ]
            .filter(Boolean)
            .join(' ') || undefined,
        icon: 'i-lucide-library',
        color: loaded.skipped.length || loaded.skippedKinds.length ? 'warning' : 'success',
      })
      return close()
    }
    s.history.checkpoint(imported.definition)
    s.selection.select(undefined)
    close()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}
</script>

<template>
  <UModal
    v-model:open="s.open.import"
    title="Import"
    description="Paste a widget, which replaces this one, or a whole library, which goes to your app."
  >
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
