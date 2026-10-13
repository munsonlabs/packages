<script setup>
import { computed, ref, watch } from 'vue'
import { hasErrors, validateKind, withKinds } from '@munsonlabs/loom'
import { KIND_OPS } from '@munsonlabs/loom/editor'
import { formatConditionValue, parseConditionValue, samplePaths, starterFrom } from './kindSpec'

/**
 * Makes or edits a kind as JSON: the kind it narrows, conditions on the data, the sources to
 * suggest, and where its widgets start. Emits `save(spec)`; the app keeps its kinds, as it keeps
 * its widgets, and adds them to its kit with `withKinds`.
 */

const open = defineModel('open', { type: Boolean, default: false })
const props = defineProps({
  /** The kit, with the app's kinds made here already added. */
  kit: { type: Object, required: true },
  /** Data to test the conditions on. */
  samples: { type: Array, default: () => [] },
  /** The kind to edit. Without it, a new one. */
  kind: Object,
  /** A widget a new kind can start from, such as the one being edited. */
  starter: Object,
  /** Whether widgets use the kind being edited, which stops it being deleted. */
  inUse: Boolean,
})
const emit = defineEmits(['save', 'remove'])

/** The Narrows menu's "nothing": Reka's select can't take an empty value. */
const NO_BASE = '-'

const OP_LABELS = { equals: 'is', in: 'is one of', includes: 'contains', exists: 'is set' }
const opItems = KIND_OPS.map((op) => ({ label: OP_LABELS[op] ?? op, value: op }))

const label = ref('')
const description = ref('')
const icon = ref('')
const base = ref(NO_BASE)
const conditions = ref([])
const sources = ref([])
const startFrom = ref('base')

/** The kit as this kind sees it: when editing, only the kinds before it, since a base must come first. */
const kitBefore = computed(() => {
  const at = props.kind ? props.kit.kinds.findIndex((k) => k.id === props.kind.id) : -1
  return at < 0 ? props.kit : { ...props.kit, kinds: props.kit.kinds.slice(0, at) }
})
const baseKind = computed(() => kitBefore.value.kinds.find((k) => k.id === base.value))

const baseItems = computed(() => [
  { label: 'Nothing: match on conditions alone', value: NO_BASE },
  ...kitBefore.value.kinds.map((k) => ({ label: k.label, value: k.id, icon: k.icon })),
])
const sourceList = computed(() => Object.values(props.kit.sources))
const paths = computed(() => samplePaths(props.samples))

const startItems = computed(() => [
  ...(props.kind?.starter ? [{ label: 'Its own layout', value: 'own' }] : []),
  ...(props.starter ? [{ label: `This widget (${props.starter.name})`, value: 'widget' }] : []),
  ...(baseKind.value ? [{ label: `${baseKind.value.label}'s layout`, value: 'base' }] : []),
])

watch(open, (isOpen) => {
  if (!isOpen) return
  const k = props.kind
  label.value = k?.label ?? ''
  description.value = k?.description ?? ''
  icon.value = k?.icon ?? ''
  // A kind started from a widget narrows that widget's kind, to begin with.
  base.value = k?.extends ?? (props.starter?.kind && props.kit.kinds.some((x) => x.id === props.starter.kind) ? props.starter.kind : NO_BASE)
  conditions.value = (k?.where ?? []).map((c) => ({
    negate: c.path.startsWith('!'),
    path: c.path.replace(/^!/, ''),
    op: c.op,
    text: formatConditionValue(c.value),
  }))
  if (!k) conditions.value.push({ negate: false, path: '', op: 'equals', text: '' })
  sources.value = [...(k?.sources ?? props.kit.kinds.find((x) => x.id === base.value)?.sources ?? [])]
  startFrom.value = k?.starter ? 'own' : props.starter && !k ? 'widget' : 'base'
})

// A new base suggests its sources, unless some are already picked.
watch(base, (id) => {
  if (sources.value.length) return
  sources.value = [...(kitBefore.value.kinds.find((k) => k.id === id)?.sources ?? [])]
})
watch(startItems, (items) => {
  if (!items.some((i) => i.value === startFrom.value)) startFrom.value = items[0]?.value ?? 'base'
})

const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'kind'

const id = computed(() => {
  if (props.kind) return props.kind.id
  const taken = new Set(props.kit.kinds.map((k) => k.id))
  let candidate = slug(label.value)
  for (let n = 2; taken.has(candidate); n++) candidate = `${slug(label.value)}-${n}`
  return candidate
})

const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])

/** The kind as it would be saved. */
const spec = computed(() => {
  const where = conditions.value
    .filter((c) => c.path.trim())
    .map((c) => {
      const value = parseConditionValue(c.text, c.op)
      return { path: `${c.negate ? '!' : ''}${c.path.trim()}`, op: c.op, ...(value === undefined ? {} : { value }) }
    })
  const starter =
    startFrom.value === 'own' ? props.kind?.starter : startFrom.value === 'widget' && props.starter ? starterFrom(props.starter) : undefined
  // Sources the same as the base's are left to inherit, so they follow it if it changes.
  const inherits = baseKind.value && sameList(sources.value, baseKind.value.sources ?? [])
  return {
    id: id.value,
    label: label.value.trim(),
    ...(description.value.trim() ? { description: description.value.trim() } : {}),
    ...(icon.value.trim() ? { icon: icon.value.trim() } : {}),
    ...(baseKind.value ? { extends: base.value } : {}),
    ...(where.length ? { where } : {}),
    ...(inherits ? {} : { sources: sources.value }),
    ...(starter ? { starter } : {}),
  }
})

const issues = computed(() => validateKind(kitBefore.value, spec.value))
const errors = computed(() => hasErrors(issues.value))

/** How many samples the kind takes, and how many its base does, so the conditions can be checked as they're written. */
const matches = computed(() => {
  if (errors.value) return undefined
  try {
    const kind = withKinds(kitBefore.value, [spec.value]).kinds.at(-1)
    const count = props.samples.filter((d) => kind.matches(d)).length
    const ofBase = baseKind.value ? props.samples.filter((d) => baseKind.value.matches(d)).length : props.samples.length
    return { count, ofBase }
  } catch {
    return undefined
  }
})

function toggleSource(sourceId, on) {
  sources.value = on ? [...sources.value, sourceId] : sources.value.filter((s) => s !== sourceId)
}

function save() {
  emit('save', spec.value)
  open.value = false
}

function remove() {
  emit('remove', props.kind.id)
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="kind ? `Edit ${kind.label}` : 'New kind'"
    description="Which data a widget is for: a kind to narrow, and conditions the data must meet."
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <form id="kind-form" class="flex flex-col gap-5" @submit.prevent="!errors && save()">
        <div class="grid grid-cols-[1fr_12rem] gap-3">
          <UFormField label="Name" :hint="`id: ${id}`">
            <UInput v-model="label" placeholder="Breaking news" class="w-full" autocomplete="off" data-1p-ignore autofocus />
          </UFormField>
          <UFormField label="Icon">
            <UInput v-model="icon" :icon="icon || baseKind?.icon || 'i-lucide-box'" :placeholder="baseKind?.icon ?? 'i-lucide-box'" class="w-full" />
          </UFormField>
        </div>
        <UFormField label="Description">
          <UInput v-model="description" placeholder="What this data is" class="w-full" />
        </UFormField>

        <UFormField label="Narrows" help="Data must be this kind first. Its sources and layout carry over unless you change them.">
          <USelect v-model="base" :items="baseItems" value-key="value" :icon="baseKind?.icon" class="w-full" />
        </UFormField>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">When the data…</span>
            <UButton
              label="Add condition"
              icon="i-lucide-plus"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="conditions.push({ negate: false, path: '', op: 'equals', text: '' })"
            />
          </div>
          <p v-if="!conditions.length" class="text-xs text-muted">No conditions: it takes everything {{ baseKind?.label ?? 'it sees' }}.</p>
          <div v-for="(c, i) in conditions" :key="i" class="flex items-center gap-2">
            <UButton
              :label="c.negate ? 'not' : 'has'"
              size="xs"
              :color="c.negate ? 'warning' : 'neutral'"
              variant="soft"
              class="w-12 justify-center"
              :title="c.negate ? 'Negated: holds when the test fails' : 'Click to negate'"
              @click="c.negate = !c.negate"
            />
            <UInput v-model="c.path" list="kind-paths" placeholder="entry.type" class="min-w-0 flex-1 font-mono" size="sm" />
            <USelect v-model="c.op" :items="opItems" value-key="value" size="sm" class="w-28" />
            <UInput v-if="c.op !== 'exists'" v-model="c.text" :placeholder="c.op === 'in' ? 'a, b, c' : 'value'" size="sm" class="min-w-0 flex-1" />
            <span v-else class="flex-1" />
            <UButton icon="i-lucide-x" size="xs" color="neutral" variant="ghost" aria-label="Remove condition" @click="conditions.splice(i, 1)" />
          </div>
          <datalist id="kind-paths">
            <option v-for="p in paths" :key="p" :value="p" />
          </datalist>
          <p v-if="matches" class="text-xs text-muted">
            Takes <strong class="text-default">{{ matches.count }}</strong> of {{ samples.length }} samples<template v-if="baseKind">
              ({{ baseKind.label }} takes {{ matches.ofBase }})</template
            >.
          </p>
        </div>

        <UFormField label="Suggested sources" help="Listed first when binding. Every source stays available.">
          <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            <UCheckbox
              v-for="source in sourceList"
              :key="source.id"
              :model-value="sources.includes(source.id)"
              :label="source.label"
              :description="source.id"
              size="sm"
              @update:model-value="toggleSource(source.id, !!$event)"
            />
          </div>
        </UFormField>

        <UFormField v-if="startItems.length" label="New widgets start from">
          <URadioGroup v-model="startFrom" :items="startItems" value-key="value" orientation="horizontal" size="sm" />
        </UFormField>

        <ul v-if="issues.length" class="flex flex-col gap-1 text-xs">
          <li
            v-for="issue in issues"
            :key="issue.message"
            class="flex items-start gap-1.5"
            :class="issue.severity === 'warning' ? 'text-warning' : 'text-error'"
          >
            <UIcon :name="issue.severity === 'warning' ? 'i-lucide-triangle-alert' : 'i-lucide-circle-x'" class="mt-0.5 size-3.5 shrink-0" />
            {{ issue.message }}
          </li>
        </ul>
      </form>
    </template>
    <template #footer>
      <div class="flex w-full justify-between gap-2">
        <UButton
          v-if="kind"
          label="Delete kind"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          :disabled="inUse"
          :title="inUse ? 'Widgets use this kind: move them to another first' : undefined"
          @click="remove"
        />
        <span v-else />
        <UButton type="submit" form="kind-form" :label="kind ? 'Save' : 'Create kind'" icon="i-lucide-check" :disabled="errors" />
      </div>
    </template>
  </UModal>
</template>
