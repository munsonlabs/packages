<script setup>
import { computed } from 'vue'
import { parseLightDark, scaleForRole, tokens, tokenVar } from '@munsonlabs/loom/editor'
import KeyValueEditor from './KeyValueEditor.vue'
import TokenInput from './TokenInput.vue'

/**
 * Overrides for the design tokens, over a theme: a definition's `vars`, or a variant's.
 * Each row shows what the theme gives and marks what's overridden here.
 */
const props = defineProps({
  /** `--w-*` → value, as stored on the definition or variant. */
  vars: { type: Object, required: true },
  /** What the values fall back to before these overrides. */
  theme: { type: Object, required: true },
  /** Labels the overrides: "this widget", "Compact". */
  scope: String,
  /** The theme's dark counterpart, when it has one: its colours are shown beside the light ones. */
  dark: Object,
})
const emit = defineEmits(['change'])

const groups = [
  { id: 'colour', label: 'Colour', hint: 'The palette', open: true },
  { id: 'roles', label: 'Roles', hint: 'What blocks read: gaps, title sizes, radii', open: true },
  { id: 'type', label: 'Type', hint: 'Fonts, the type scale, weights' },
  { id: 'space', label: 'Space', hint: 'The space scale gaps and padding pick from' },
  { id: 'shape', label: 'Shape', hint: 'Radii and shadows' },
]

const byGroup = (group) => tokens.filter((t) => t.group === group)
const inherited = (t) => props.theme.values[t.name] ?? props.theme.values[tokenVar(t.name)] ?? t.default
/** What a colour is in the dark counterpart: this widget's override if it sets one (it applies to both), else the dark theme's. */
/** What the dark counterpart gives, before this widget's overrides. */
const darkInherited = (t) => props.dark?.values[t.name] ?? props.dark?.values[tokenVar(t.name)] ?? inherited(t)
const inDark = (t) => {
  const own = value(t)
  const pair = parseLightDark(own)
  return pair?.[1] ?? own ?? props.dark?.values[t.name] ?? props.dark?.values[tokenVar(t.name)] ?? t.default
}
const overridden = (t) => tokenVar(t.name) in props.vars
const value = (t) => props.vars[tokenVar(t.name)]
const count = (group) => byGroup(group).filter(overridden).length

/** A colour to show for a value, following one level of `var(--w-…)`. */
function paint(raw) {
  // A light/dark pair shows its light half here; the dark column shows the other.
  const pair = parseLightDark(raw)
  if (pair) return paint(pair[0])
  const name = raw?.match(/^var\(--w-([a-z0-9-]+)\)$/)?.[1]
  if (!name) return raw ?? 'transparent'
  const t = tokens.find((x) => x.name === name)
  return t ? paint(value(t) ?? inherited(t)) : 'transparent'
}

function set(t, next) {
  const vars = { ...props.vars }
  if (next.trim()) vars[tokenVar(t.name)] = next
  else delete vars[tokenVar(t.name)]
  emit('change', vars)
}

function reset(t) {
  const { [tokenVar(t.name)]: _, ...rest } = props.vars
  emit('change', rest)
}

/** Custom properties that aren't tokens: kept, editable, but not offered as a scale. */
const others = computed(() => Object.fromEntries(Object.entries(props.vars).filter(([key]) => !tokens.some((t) => tokenVar(t.name) === key))))

function setOthers(next) {
  const tokenOnly = Object.fromEntries(Object.entries(props.vars).filter(([key]) => tokens.some((t) => tokenVar(t.name) === key)))
  emit('change', { ...tokenOnly, ...next })
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-xs text-muted">
      Starting from the <strong class="text-default">{{ theme.label }}</strong> theme<template v-if="dark"
        >, with <strong class="text-default">{{ dark.label }}</strong> beside each colour</template
      >. Changes here apply to {{ scope ?? 'this widget' }} only, in light and dark alike: press the moon on a colour to give it its own dark value.
    </p>

    <details v-for="group in groups" :key="group.id" :open="group.open" class="group rounded-md border border-default">
      <summary class="flex cursor-pointer items-center gap-2 px-2.5 py-2 text-xs font-medium select-none">
        <UIcon name="i-lucide-chevron-right" class="size-3.5 text-muted transition-transform group-open:rotate-90" />
        {{ group.label }}
        <span class="font-normal text-dimmed">{{ group.hint }}</span>
        <UBadge v-if="count(group.id)" :label="String(count(group.id))" color="warning" variant="subtle" size="sm" class="ml-auto" />
      </summary>

      <div class="flex flex-col gap-1.5 border-t border-default p-2">
        <div v-for="t in byGroup(group.id)" :key="t.name" class="flex items-center gap-2">
          <UTooltip :text="t.description ?? `--w-${t.name}`">
            <span class="w-28 shrink-0 truncate text-xs" :class="overridden(t) ? 'font-medium text-default' : 'text-muted'">{{ t.label }}</span>
          </UTooltip>

          <template v-if="t.kind === 'color' && group.id === 'colour'">
            <UPopover>
              <button
                type="button"
                class="size-6 shrink-0 rounded-md ring ring-default"
                :style="{ background: paint(value(t) ?? inherited(t)) }"
                :aria-label="`Pick ${t.label}`"
              />
              <template #content>
                <UColorPicker
                  :model-value="(value(t) ?? inherited(t)).startsWith('#') ? (value(t) ?? inherited(t)) : '#000000'"
                  class="p-2"
                  @update:model-value="set(t, String($event))"
                />
              </template>
            </UPopover>
            <TokenInput
              :model-value="value(t)"
              scale="color"
              :placeholder="inherited(t)"
              :seed="[inherited(t), darkInherited(t)]"
              @update:model-value="set(t, $event)"
            />
            <UTooltip
              v-if="dark"
              :text="`In ${dark.label}: ${inDark(t)}${overridden(t) && !parseLightDark(value(t)) ? ' (this override applies in dark too; the moon gives it its own dark value)' : ''}`"
            >
              <span class="flex size-6 shrink-0 items-center justify-center rounded-md bg-neutral-900 ring ring-default">
                <span class="size-3.5 rounded-sm" :style="{ background: paint(inDark(t)) }" />
              </span>
            </UTooltip>
          </template>
          <TokenInput
            v-else-if="t.group === 'roles' && scaleForRole[t.name]"
            :model-value="value(t)"
            :scale="scaleForRole[t.name]"
            :placeholder="inherited(t).replace(/^var\(--w-(.+)\)$/, '$1')"
            @update:model-value="set(t, $event)"
          />
          <UInput
            v-else
            :model-value="value(t) ?? ''"
            :placeholder="inherited(t)"
            size="xs"
            class="min-w-0 flex-1"
            @update:model-value="set(t, String($event))"
          />

          <UButton
            v-if="overridden(t)"
            icon="i-lucide-rotate-ccw"
            size="xs"
            color="warning"
            variant="ghost"
            :aria-label="`Reset ${t.label}`"
            @click="reset(t)"
          />
          <span v-else class="w-6 shrink-0" />
        </div>
      </div>
    </details>

    <details class="group rounded-md border border-default">
      <summary class="flex cursor-pointer items-center gap-2 px-2.5 py-2 text-xs font-medium select-none">
        <UIcon name="i-lucide-chevron-right" class="size-3.5 text-muted transition-transform group-open:rotate-90" />
        Other variables
        <span class="font-normal text-dimmed">Your own custom properties</span>
      </summary>
      <div class="border-t border-default p-2">
        <KeyValueEditor :entries="others" key-placeholder="--brand-stripe" value-placeholder="value" @change="setOthers" />
      </div>
    </details>
  </div>
</template>
