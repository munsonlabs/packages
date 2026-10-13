<script setup>
import { computed, useId } from 'vue'
import { CONDITION_OPS, definitionMatches } from '@munsonlabs/loom/editor'
import { emptyRow, matchFrom, OP_LABELS, samplePaths } from './conditions'

/**
 * The form for when a widget renders and what it uses: conditions on the data, with a live count
 * of the samples they take, and the sources it can bind to. Shared by the new-widget dialog and
 * the studio's own.
 */

/** Condition rows (`conditions.js`), as the form edits them. */
const rows = defineModel('rows', { type: Array, required: true })
/** Source ids the widget can bind to. */
const uses = defineModel('uses', { type: Array, required: true })
const props = defineProps({
  kit: { type: Object, required: true },
  /** Data to test the conditions on. */
  samples: { type: Array, default: () => [] },
})

const opItems = CONDITION_OPS.map((op) => ({ label: OP_LABELS[op] ?? op, value: op }))
const listId = useId()
const paths = computed(() => samplePaths(props.samples))
const sourceList = computed(() => Object.values(props.kit.sources))
const taken = computed(() => {
  const match = matchFrom(rows.value)
  return props.samples.filter((d) => definitionMatches({ match }, d)).length
})

function toggleSource(id, on) {
  uses.value = on ? sourceList.value.map((s) => s.id).filter((s) => s === id || uses.value.includes(s)) : uses.value.filter((s) => s !== id)
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">Renders when the data…</span>
        <UButton label="Add condition" icon="i-lucide-plus" size="xs" color="neutral" variant="ghost" @click="rows.push(emptyRow())" />
      </div>
      <p v-if="!rows.length" class="text-xs text-muted">No conditions: it takes any data that reaches it.</p>
      <div v-for="(c, i) in rows" :key="i" class="flex items-center gap-2">
        <UButton
          :label="c.negate ? 'not' : 'has'"
          size="xs"
          :color="c.negate ? 'warning' : 'neutral'"
          variant="soft"
          class="w-12 justify-center"
          :title="c.negate ? 'Negated: holds when the test fails' : 'Click to negate'"
          @click="c.negate = !c.negate"
        />
        <UInput v-model="c.path" :list="listId" placeholder="entry.type" class="min-w-0 flex-1 font-mono" size="sm" />
        <USelect v-model="c.op" :items="opItems" value-key="value" size="sm" class="w-28" />
        <UInput v-if="c.op !== 'exists'" v-model="c.text" :placeholder="c.op === 'in' ? 'a, b, c' : 'value'" size="sm" class="min-w-0 flex-1" />
        <span v-else class="flex-1" />
        <UButton icon="i-lucide-x" size="xs" color="neutral" variant="ghost" aria-label="Remove condition" @click="rows.splice(i, 1)" />
      </div>
      <datalist :id="listId">
        <option v-for="p in paths" :key="p" :value="p" />
      </datalist>
      <p v-if="samples.length" class="text-xs text-muted">
        Takes <strong class="text-default">{{ taken }}</strong> of {{ samples.length }} samples.
      </p>
    </div>

    <UFormField label="Uses" help="The composables it can bind to. Only these are offered when binding.">
      <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        <UCheckbox
          v-for="source in sourceList"
          :key="source.id"
          :model-value="uses.includes(source.id)"
          :label="source.label"
          :description="source.id"
          size="sm"
          @update:model-value="toggleSource(source.id, !!$event)"
        />
      </div>
    </UFormField>
  </div>
</template>
