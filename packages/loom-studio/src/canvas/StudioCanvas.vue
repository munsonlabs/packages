<script setup>
import { computed } from 'vue'
import { Widget } from '@munsonlabs/loom'
import { BASE_VARIANT } from '@munsonlabs/loom/editor'
import { viewportHint } from '../preview/usePreview'
import { useStudio } from '../studio'

/** The dotted canvas: the widget at the chosen width, the selection outline, and drag feedback. */
const s = useStudio()

/** Outlines the selection (dashed when it isn't rendered and an ancestor stands in) and fades what's being dragged. */
const selectionCss = computed(() => {
  const rules = []
  const anchor = s.selection.selectedEl?.dataset.nodeId
  if (s.selection.selectedId && s.selection.anchoredToSelf) {
    rules.push(`.loom-stage [data-node-id="${CSS.escape(s.selection.selectedId)}"] { outline: 2px solid var(--ui-primary); outline-offset: 3px; }`)
  } else if (anchor) {
    rules.push(`.loom-stage [data-node-id="${CSS.escape(anchor)}"] { outline: 2px dashed var(--ui-warning); outline-offset: 3px; }`)
  }
  if (s.drag.dragging) rules.push(`.loom-stage [data-node-id="${CSS.escape(s.drag.dragging.id)}"] { opacity: 0.35; }`)
  return rules.join('\n')
})

const shownVariant = computed(() => (s.preview.followRules ? s.preview.matchedVariant : s.variants.variantId))
</script>

<template>
  <div
    :ref="(el) => (s.stage = el)"
    class="loom-stage absolute inset-0 flex flex-col overflow-auto px-6 pt-24 pb-24"
    :class="{ 'is-editing': s.preview.mode === 'edit', 'is-dragging': !!s.drag.dragging }"
    @click.capture="s.onStageClick"
    @pointerdown="s.drag.onPointerDown"
    @dragstart.capture="s.preview.mode === 'edit' && $event.preventDefault()"
  >
    <component :is="'style'">{{ selectionCss }}</component>
    <!-- The widget at the chosen width, centred, with what it's previewing above it. -->
    <div class="loom-artboard m-auto flex max-w-full flex-col" :class="{ 'w-full': !s.preview.viewport.width }">
      <div class="mb-2 flex items-center gap-1.5 px-1 text-[11px] text-muted select-none">
        <UIcon :name="s.preview.viewport.icon" class="size-3.5" />
        <span class="font-medium text-default">{{ s.preview.viewport.label }}</span>
        <span>{{ viewportHint(s.preview.viewport.width) }}</span>
        <span class="ml-auto flex items-center gap-1.5">
          <span v-if="s.props.kit.themes.length > 1" class="flex items-center gap-1"
            ><UIcon name="i-lucide-palette" class="size-3" />{{ s.preview.theme.label }}</span
          >
          <span class="flex items-center gap-1" :class="{ 'text-warning': shownVariant !== BASE_VARIANT }">
            <UIcon name="i-lucide-git-branch" class="size-3" />{{ s.variants.variantLabel(shownVariant) }}
          </span>
          <span class="flex items-center gap-1"
            ><UIcon :name="s.preview.activeScheme === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'" class="size-3" />{{ s.preview.activeScheme }}</span
          >
        </span>
      </div>
      <div
        class="transition-[width] duration-200"
        :style="{ width: s.preview.viewport.width ? `${s.preview.viewport.width}px` : '100%', maxWidth: '100%' }"
      >
        <Widget
          v-if="s.preview.sample !== undefined"
          :key="s.preview.sampleIndex"
          :kit="s.props.kit"
          :definition="s.definition"
          :data="s.preview.sample"
          :index="s.preview.sampleIndex"
          :context="s.callLog.previewContext"
          :variant="s.preview.followRules ? undefined : s.variants.variantId"
          :theme="s.preview.themeId"
          :scheme="s.preview.previewScheme"
          @variant="s.preview.matchedVariant = $event"
        />
      </div>
    </div>
  </div>

  <!-- Where a drag would land: a line between elements, or a box inside a container. -->
  <div
    v-if="s.drag.indicator"
    class="pointer-events-none fixed z-50"
    :class="
      s.drag.indicator.kind === 'line'
        ? 'rounded-full bg-primary'
        : 'rounded-md bg-primary/5 outline-2 outline-offset-2 outline-primary outline-dashed'
    "
    :style="{
      top: `${s.drag.indicator.top}px`,
      left: `${s.drag.indicator.left}px`,
      width: `${s.drag.indicator.width}px`,
      height: `${s.drag.indicator.height}px`,
    }"
  />
  <div
    v-if="s.drag.dragging"
    class="loom-bar pointer-events-none fixed z-50 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
    :style="{ left: `${s.drag.pointer.x + 14}px`, top: `${s.drag.pointer.y + 14}px` }"
  >
    <UIcon name="i-lucide-move" class="size-3 text-primary" />
    {{ s.drag.dragging.label }}
    <span v-if="s.variants.variant" class="text-warning">· reorder in {{ s.variants.variant.label }}</span>
  </div>
</template>
