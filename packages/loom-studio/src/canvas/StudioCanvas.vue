<script setup>
import { computed, reactive } from 'vue'
import { Widget } from '@munsonlabs/loom'
import { BASE_VARIANT } from '@munsonlabs/loom/editor'
import { frameHint } from '../preview/frames'
import { viewportHint } from '../preview/usePreview'
import { useStudio } from '../studio'

/**
 * The dotted canvas: the widget in one frame, or in a row of frames side by side (one per width,
 * variant, sample or scheme), plus the selection outline and drag feedback. The focused frame is
 * the one being edited (`data-focused-frame`): selection, drag and the tour look inside it.
 */
const s = useStudio()

/** Outlines the selection in every frame (dashed when it isn't rendered and an ancestor stands in) and fades what's being dragged. */
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

const single = computed(() => s.preview.frameMode === 'one')
const shownVariant = computed(() => (s.preview.followRules ? s.preview.matchedVariant : s.variants.variantId))

/** The variant each frame's widget drew, by frame key: what its label shows. */
const drawn = reactive({})
function onVariant(frame, id) {
  drawn[frame.key] = id
  if (frame.focused) s.preview.matchedVariant = id
}
</script>

<template>
  <div
    :ref="(el) => (s.canvas = el)"
    class="loom-stage absolute inset-0 flex flex-col overflow-auto px-6 pt-24 pb-24"
    :class="{ 'is-editing': s.preview.mode === 'edit', 'is-dragging': !!s.drag.dragging }"
    @click.capture="s.onStageClick"
    @pointerdown="s.drag.onPointerDown"
    @dragstart.capture="s.preview.mode === 'edit' && $event.preventDefault()"
  >
    <component :is="'style'">{{ selectionCss }}</component>
    <div
      class="m-auto flex max-w-full flex-wrap items-start justify-center gap-x-10 gap-y-12"
      :class="{ 'w-full': single && !s.preview.viewport.width }"
    >
      <div
        v-for="frame in s.frames"
        :key="frame.key"
        class="loom-artboard flex max-w-full flex-col"
        :class="{ 'w-full': !frame.width, 'is-other-frame': !single && !frame.focused }"
        :data-frame="frame.key"
      >
        <!-- One widget: what it's previewing, above it. -->
        <div v-if="single" class="mb-2 flex items-center gap-1.5 px-1 text-[11px] text-muted select-none">
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
        <!-- A frame among several: what it varies, which variant it drew, and whether it's the one being edited. -->
        <div v-else class="mb-2 flex items-center gap-1.5 px-1 text-[11px] select-none" :class="frame.focused ? 'text-primary' : 'text-muted'">
          <UIcon :name="frame.icon" class="size-3.5" />
          <span class="truncate font-medium" :class="{ 'text-default': !frame.focused }">{{ frame.label }}</span>
          <span class="shrink-0">{{ frameHint(frame) }}</span>
          <span
            v-if="drawn[frame.key] && s.preview.frameMode !== 'variants'"
            class="ml-auto flex shrink-0 items-center gap-1"
            :class="{ 'text-warning': drawn[frame.key] !== BASE_VARIANT }"
          >
            <UIcon name="i-lucide-git-branch" class="size-3" />{{ s.variants.variantLabel(drawn[frame.key]) }}
          </span>
          <span
            v-if="frame.focused"
            class="shrink-0 rounded-full bg-primary/10 px-1.5 text-[10px]"
            :class="{ 'ml-auto': s.preview.frameMode === 'variants' }"
            >editing</span
          >
        </div>
        <div
          class="transition-[width] duration-200"
          :data-focused-frame="frame.focused || undefined"
          :style="{ width: frame.width ? `${frame.width}px` : '100%', maxWidth: '100%' }"
        >
          <Widget
            v-if="s.props.samples[frame.sampleIndex] !== undefined"
            :key="frame.sampleIndex"
            :kit="s.props.kit"
            :definition="s.definition"
            :definitions="s.library"
            :data="s.props.samples[frame.sampleIndex]"
            :index="frame.sampleIndex"
            :context="s.callLog.previewContext"
            :variant="frame.variant"
            :theme="s.preview.themeId"
            :scheme="frame.scheme"
            @variant="onVariant(frame, $event)"
          />
        </div>
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
