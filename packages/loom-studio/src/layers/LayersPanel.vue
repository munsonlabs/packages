<script setup>
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { listNodes } from '../editing/tree'
import { useStudio } from '../studio'
import { dropPosition, layerRows } from './layers'

/**
 * Layers: the widget's tree, one row per element, beside the canvas. Click a row to select it,
 * drag rows to move them, and reach elements that aren't on screen.
 */
const s = useStudio()

const collapsed = ref(new Set())
const rows = computed(() => layerRows(s.props.kit, s.variants.tree, collapsed.value))
const rootId = computed(() => s.definition.root.id)

function toggle(id) {
  const next = new Set(collapsed.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  collapsed.value = next
}

// Which elements are on screen: anything else is hidden, or empty or switched off for this sample.
const onScreen = shallowRef(new Set())
function measure() {
  onScreen.value = new Set(
    listNodes(s.variants.tree.root)
      .map(({ node }) => node.id)
      .filter((id) => s.selection.elementFor(id)),
  )
}
watch([() => s.variants.rendered, () => s.preview.sampleIndex, () => s.preview.followRules, () => s.preview.viewport], () => void nextTick(measure), {
  flush: 'post',
  immediate: true,
})

const offScreen = (row) => !row.hidden && !row.insideHidden && !onScreen.value.has(row.id)

// --- Selection: shared with the canvas, and kept in view.
const list = ref()
watch(
  () => s.selection.selectedId,
  (id) =>
    void nextTick(() => {
      if (id) list.value?.querySelector(`[data-layer="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' })
    }),
)

// --- Drag and drop between rows. The rules are the canvas's: anything anywhere on the base, siblings only in a variant.
const dragging = ref()
const target = ref()

function onDragStart(event, row) {
  if (row.id === rootId.value) return event.preventDefault()
  dragging.value = row.id
  event.dataTransfer?.setData('text/plain', row.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(event, row) {
  if (!dragging.value) return
  const position = row.id === rootId.value ? 'inside' : dropPosition(event.clientY, event.currentTarget.getBoundingClientRect(), row.isContainer)
  const candidate = { id: row.id, position }
  if (!s.editing.canDrop(dragging.value, candidate)) return (target.value = undefined)
  event.preventDefault()
  target.value = candidate
}

function onDrop(event) {
  event.preventDefault()
  if (dragging.value && target.value) s.editing.drop(dragging.value, target.value)
  endDrag()
}

function endDrag() {
  dragging.value = undefined
  target.value = undefined
}

/** Runs one of the selection's actions on a row's element, without opening its editor. */
function on(id, action) {
  s.selection.select(id, false)
  action()
}
</script>

<template>
  <aside class="loom-bar absolute top-16 bottom-16 left-3 z-10 flex w-72 flex-col overflow-hidden rounded-xl" data-tour="layers-panel">
    <div class="flex items-center gap-2 border-b border-default px-3 py-2">
      <UIcon name="i-lucide-layers" class="size-4 text-primary" />
      <span class="text-sm font-medium">Layers</span>
      <span v-if="s.variants.variant" class="truncate text-[11px] text-warning">reorder in {{ s.variants.variant.label }}</span>
      <UButton icon="i-lucide-x" size="xs" color="neutral" variant="ghost" class="ml-auto" aria-label="Close layers" @click="s.open.layers = false" />
    </div>

    <ol ref="list" class="min-h-0 flex-1 overflow-y-auto py-1 text-xs" @dragleave.self="target = undefined">
      <li
        v-for="row in rows"
        :key="row.id"
        :data-layer="row.id"
        :draggable="row.id !== rootId"
        class="group relative flex h-7 cursor-default items-center gap-1 pr-1"
        :class="[
          row.id === s.selection.selectedId ? 'bg-primary/10 text-default' : 'hover:bg-elevated',
          (row.hidden || row.insideHidden) && 'opacity-45',
          dragging === row.id && 'opacity-30',
          target?.id === row.id && target.position === 'inside' && 'bg-primary/15 outline outline-1 -outline-offset-1 outline-primary',
        ]"
        :style="{ paddingLeft: `${8 + row.depth * 14}px` }"
        @click="s.selection.select(row.id)"
        @dragstart="onDragStart($event, row)"
        @dragover="onDragOver($event, row)"
        @drop="onDrop"
        @dragend="endDrag"
      >
        <span
          v-if="target?.id === row.id && target.position !== 'inside'"
          class="pointer-events-none absolute right-1 h-0.5 rounded-full bg-primary"
          :class="target.position === 'before' ? 'top-0' : 'bottom-0'"
          :style="{ left: `${8 + row.depth * 14}px` }"
        />
        <button
          v-if="row.hasChildren"
          type="button"
          class="flex size-4 shrink-0 items-center justify-center rounded text-dimmed hover:text-default"
          :aria-label="collapsed.has(row.id) ? 'Expand' : 'Collapse'"
          @click.stop="toggle(row.id)"
        >
          <UIcon :name="collapsed.has(row.id) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'" class="size-3" />
        </button>
        <span v-else class="size-4 shrink-0" />
        <UIcon :name="row.icon" class="size-3.5 shrink-0" :class="row.id === s.selection.selectedId ? 'text-primary' : 'text-muted'" />
        <span class="shrink-0 font-medium">{{ row.label }}</span>
        <span class="min-w-0 truncate text-dimmed">{{ row.hint ?? `#${row.id}` }}</span>

        <span class="ml-auto flex shrink-0 items-center">
          <UTooltip v-if="offScreen(row)" text="Not shown for this sample: its Show when, or an empty value">
            <UIcon name="i-lucide-scan-eye" class="mx-1 size-3.5 text-dimmed group-hover:hidden" />
          </UTooltip>
          <template v-if="s.variants.variant">
            <UButton
              v-if="row.id !== rootId"
              :icon="row.hidden ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              size="xs"
              color="warning"
              variant="ghost"
              :class="row.hidden ? '' : 'hidden group-hover:flex'"
              :aria-label="row.hidden ? 'Show in this variant' : 'Hide in this variant'"
              @click.stop="s.variants.toggleHidden(row.id)"
            />
          </template>
          <template v-else-if="row.id !== rootId">
            <UButton
              icon="i-lucide-copy"
              size="xs"
              color="neutral"
              variant="ghost"
              class="hidden group-hover:flex"
              aria-label="Duplicate"
              @click.stop="on(row.id, s.editing.duplicate)"
            />
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              color="error"
              variant="ghost"
              class="hidden group-hover:flex"
              aria-label="Delete"
              @click.stop="on(row.id, s.editing.remove)"
            />
          </template>
        </span>
      </li>
    </ol>

    <p class="border-t border-default px-3 py-1.5 text-[11px] text-dimmed">Drag to move · drop mid-container to nest</p>
  </aside>
</template>
