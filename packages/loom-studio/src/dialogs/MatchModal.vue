<script setup>
import { ref, watch } from 'vue'
import { useStudio } from '../studio'
import { matchFrom, rowsFrom } from './conditions'
import MatchFields from './MatchFields.vue'

/** When the open widget renders and what it uses, from the identity bar. Saving is one undoable change. */
const s = useStudio()

const rows = ref([])
const uses = ref([])

watch(
  () => s.open.match,
  (isOpen) => {
    if (!isOpen) return
    rows.value = rowsFrom(s.definition.match)
    uses.value = [...(s.definition.uses ?? Object.keys(s.props.kit.sources))]
  },
)

function save() {
  const match = matchFrom(rows.value)
  s.history.change((d) => {
    if (match.length) d.match = match
    else delete d.match
    d.uses = [...uses.value]
  })
  s.open.match = false
}
</script>

<template>
  <UModal
    v-model:open="s.open.match"
    title="When it renders"
    description="Which data this widget is for, and the composables it binds to. Apps render the first widget in their library whose conditions the data meets."
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <form id="match-form" @submit.prevent="save">
        <MatchFields v-model:rows="rows" v-model:uses="uses" :kit="s.props.kit" :samples="s.props.samples" />
      </form>
    </template>
    <template #footer>
      <div class="flex w-full justify-end">
        <UButton type="submit" form="match-form" label="Save" icon="i-lucide-check" />
      </div>
    </template>
  </UModal>
</template>
