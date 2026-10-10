<script setup>
import { getTheme } from '@munsonlabs/loom'
import TokensEditor from './TokensEditor.vue'
import { valueOptions } from './options'

const props = defineProps({
  kit: { type: Object, required: true },
  definition: { type: Object, required: true },
  activeId: { type: String, required: true },
  themeId: String,
})

/** A variant's variables start from the theme plus the widget's own. */
const base = () => {
  const theme = getTheme(props.kit, props.themeId)
  return { ...theme, label: `${theme.label} + this widget's`, values: { ...theme.values, ...props.definition.vars } }
}
const emit = defineEmits(['change', 'select'])

const sizes = [
  { size: 'sm', hint: 'under 300px' },
  { size: 'md', hint: '300–499px' },
  { size: 'lg', hint: '500px and up' },
]

const variants = () => props.definition.variants ?? []
const ruleOptions = () => valueOptions(props.kit, props.definition, props.definition.root.id, (o) => o.type !== 'action' && o.source !== 'item')

function patch(id, change) {
  emit(
    'change',
    variants().map((v) => (v.id === id ? change(v) : v)),
  )
}

function setRule(v, rule) {
  const when = { ...v.when, ...rule }
  for (const key of Object.keys(when)) {
    const value = when[key]
    if (value === undefined || (Array.isArray(value) && !value.length)) delete when[key]
  }
  patch(v.id, (x) => ({ ...x, when }))
}

function toggleSize(v, size) {
  const current = v.when?.size ?? []
  setRule(v, { size: current.includes(size) ? current.filter((s) => s !== size) : [...current, size] })
}

function conditionOf(v) {
  const path = v.when?.if
  return path ? { path: path.replace(/^!/, ''), negate: path.startsWith('!') } : undefined
}

function add() {
  const taken = new Set(variants().map((v) => v.id))
  let n = 1
  while (taken.has(`variant-${n}`)) n++
  const id = `variant-${n}`
  emit('change', [...variants(), { id, label: `Variant ${n}`, when: {} }])
  emit('select', id)
}

function remove(id) {
  emit(
    'change',
    variants().filter((v) => v.id !== id),
  )
  if (props.activeId === id) emit('select', 'base')
}

function move(index, delta) {
  const next = [...variants()]
  const to = index + delta
  if (to < 0 || to >= next.length) return
  next.splice(to, 0, ...next.splice(index, 1))
  emit('change', next)
}
</script>

<template>
  <div class="flex flex-col gap-2 p-2">
    <p class="px-1 text-xs text-muted">
      A variant is a diff on the base: hide, reorder and override nodes. The first variant whose rule matches renders; with no rule it only renders
      when the host pins it.
    </p>

    <div
      v-for="(v, i) in variants()"
      :key="v.id"
      class="flex flex-col gap-2.5 rounded-md border p-2.5 transition-colors"
      :class="v.id === activeId ? 'border-primary bg-primary/5' : 'border-default'"
    >
      <div class="flex items-center gap-1">
        <UInput
          :model-value="v.label"
          size="xs"
          variant="ghost"
          class="min-w-0 flex-1 font-medium"
          aria-label="Variant name"
          @update:model-value="patch(v.id, (x) => ({ ...x, label: String($event) }))"
        />
        <UButton
          :label="v.id === activeId ? 'Editing' : 'Edit'"
          size="xs"
          :variant="v.id === activeId ? 'solid' : 'soft'"
          @click="emit('select', v.id)"
        />
        <UDropdownMenu
          :items="[
            { label: 'Higher priority', icon: 'i-lucide-arrow-up', disabled: i === 0, onSelect: () => move(i, -1) },
            { label: 'Lower priority', icon: 'i-lucide-arrow-down', disabled: i === variants().length - 1, onSelect: () => move(i, 1) },
            { type: 'separator' },
            { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => remove(v.id) },
          ]"
        >
          <UButton icon="i-lucide-ellipsis-vertical" size="xs" color="neutral" variant="ghost" aria-label="Variant actions" />
        </UDropdownMenu>
      </div>
      <code class="-mt-1.5 px-2 text-[11px] text-muted">{{ v.id }} · priority {{ i + 1 }}</code>

      <UFormField label="When the data…" size="xs">
        <div class="flex items-center gap-1">
          <USelect
            :model-value="conditionOf(v)?.path"
            :items="ruleOptions()"
            value-key="value"
            placeholder="Anything"
            icon="i-lucide-filter"
            size="xs"
            class="min-w-0 flex-1"
            @update:model-value="setRule(v, { if: (conditionOf(v)?.negate ? '!' : '') + String($event) })"
          />
          <UButton
            v-if="conditionOf(v)"
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="ghost"
            aria-label="Anything"
            @click="setRule(v, { if: undefined })"
          />
        </div>
        <USwitch
          v-if="conditionOf(v)"
          class="mt-1.5"
          :model-value="conditionOf(v).negate"
          label="…is falsy instead"
          size="xs"
          @update:model-value="setRule(v, { if: ($event ? '!' : '') + conditionOf(v).path })"
        />
      </UFormField>

      <UFormField label="…in" size="xs">
        <div class="flex gap-1">
          <UButton
            v-for="scheme in ['light', 'dark']"
            :key="scheme"
            :label="scheme"
            :icon="scheme === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
            size="xs"
            :color="v.when?.scheme === scheme ? 'primary' : 'neutral'"
            :variant="v.when?.scheme === scheme ? 'soft' : 'outline'"
            @click="setRule(v, { scheme: v.when?.scheme === scheme ? undefined : scheme })"
          />
          <span v-if="!v.when?.scheme" class="self-center pl-1 text-[11px] text-muted">either mode</span>
        </div>
      </UFormField>

      <UFormField label="…and the widget is" size="xs">
        <div class="flex gap-1">
          <UTooltip v-for="s in sizes" :key="s.size" :text="s.hint">
            <UButton
              :label="s.size"
              size="xs"
              :color="v.when?.size?.includes(s.size) ? 'primary' : 'neutral'"
              :variant="v.when?.size?.includes(s.size) ? 'soft' : 'outline'"
              @click="toggleSize(v, s.size)"
            />
          </UTooltip>
          <span v-if="!v.when?.size?.length" class="self-center pl-1 text-[11px] text-muted">any size</span>
        </div>
      </UFormField>

      <details class="group">
        <summary class="flex cursor-pointer items-center gap-1.5 text-xs font-medium select-none">
          <UIcon name="i-lucide-chevron-right" class="size-3.5 text-muted transition-transform group-open:rotate-90" />
          Theme overrides
          <UBadge
            v-if="Object.keys(v.vars ?? {}).length"
            :label="String(Object.keys(v.vars ?? {}).length)"
            color="warning"
            variant="subtle"
            size="sm"
          />
        </summary>
        <div class="mt-2">
          <TokensEditor
            :vars="v.vars ?? {}"
            :theme="base()"
            :scope="v.label"
            @change="(vars) => patch(v.id, (x) => ({ ...x, vars: Object.keys(vars).length ? vars : undefined }))"
          />
        </div>
      </details>

      <p v-if="!v.when?.if && !v.when?.size?.length && !v.when?.scheme" class="text-[11px] text-warning">
        No rule: only renders when the host pins it.
      </p>
    </div>

    <UButton label="Add variant" icon="i-lucide-plus" color="neutral" variant="outline" block @click="add" />
  </div>
</template>
