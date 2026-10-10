<script setup>
import { computed, ref } from 'vue'
import TokenInput from './TokenInput.vue'

/**
 * A node's inline style, property by property. Properties that take a token scale (padding,
 * radius, colour…) pick from it; anything else is plain CSS.
 */
const props = defineProps({
  entries: { type: Object, required: true },
})
const emit = defineEmits(['change'])

const properties = [
  {
    group: 'Spacing',
    items: [
      ['padding', 'space'],
      ['margin', 'space'],
      ['margin-top', 'space'],
      ['gap', 'space'],
    ],
  },
  {
    group: 'Colour',
    items: [
      ['color', 'color'],
      ['background', 'color'],
      ['border-color', 'color'],
    ],
  },
  {
    group: 'Shape',
    items: [
      ['border-radius', 'radius'],
      ['box-shadow', 'shadow'],
      ['border', undefined],
      ['opacity', undefined],
    ],
  },
  {
    group: 'Type',
    items: [
      ['font-size', 'text'],
      ['font-weight', 'weight'],
      ['font-family', 'font'],
      ['text-align', undefined],
      ['letter-spacing', undefined],
    ],
  },
  {
    group: 'Layout',
    items: [
      ['flex', undefined],
      ['width', undefined],
      ['max-width', undefined],
      ['aspect-ratio', undefined],
      ['align-self', undefined],
    ],
  },
]
const scaleOf = Object.fromEntries(properties.flatMap((g) => g.items))

const addOptions = computed(() =>
  properties.map((g) => [
    { type: 'label', label: g.group },
    ...g.items
      .filter(([name]) => !(name in props.entries))
      .map(([name, scale]) => ({ label: name, icon: scale ? 'i-lucide-swatch-book' : undefined, onSelect: () => set(name, '') })),
  ]),
)

const other = ref('')

function addOther() {
  set(other.value.trim(), '')
  other.value = ''
}

function set(name, value) {
  if (!name) return
  emit('change', { ...props.entries, [name]: value })
}

function remove(name) {
  const { [name]: _, ...rest } = props.entries
  emit('change', rest)
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div v-for="(value, name) in entries" :key="name" class="flex items-center gap-1.5">
      <code class="w-24 shrink-0 truncate text-xs text-muted" :title="String(name)">{{ name }}</code>
      <TokenInput :model-value="value" :scale="scaleOf[name]" placeholder="Pick a value" @update:model-value="set(String(name), $event)" />
      <UButton icon="i-lucide-x" size="xs" color="neutral" variant="ghost" :aria-label="`Remove ${name}`" @click="remove(String(name))" />
    </div>
    <div class="flex items-center gap-1.5">
      <UDropdownMenu :items="addOptions" :content="{ align: 'start' }">
        <UButton label="Add style" icon="i-lucide-plus" size="xs" color="neutral" variant="soft" />
      </UDropdownMenu>
      <form class="flex min-w-0 flex-1 items-center gap-1" @submit.prevent="addOther">
        <UInput v-model="other" size="xs" placeholder="or any property" class="min-w-0 flex-1" />
        <UButton
          type="submit"
          icon="i-lucide-corner-down-left"
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="!other.trim()"
          aria-label="Add property"
        />
      </form>
    </div>
  </div>
</template>
