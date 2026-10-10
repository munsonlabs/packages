<script setup>
import { computed } from 'vue'
import { Widget } from '@munsonlabs/loom'
import { viewportHint } from '../preview/usePreview'
import { useStudio } from '../studio'

/** The dotted canvas: the widget at the chosen width, and the selection outline. */
const s = useStudio()

/** Outlines the selection (dashed when it isn't rendered and an ancestor stands in). */
const selectionCss = computed(() => {
  const rules = []
  const anchor = s.selection.selectedEl?.dataset.nodeId
  if (s.selection.selectedId && s.selection.anchoredToSelf) {
    rules.push(`.loom-stage [data-node-id="${CSS.escape(s.selection.selectedId)}"] { outline: 2px solid var(--ui-primary); outline-offset: 3px; }`)
  } else if (anchor) {
    rules.push(`.loom-stage [data-node-id="${CSS.escape(anchor)}"] { outline: 2px dashed var(--ui-warning); outline-offset: 3px; }`)
  }
  return rules.join('\n')
})
</script>

<template>
  <div
    :ref="(el) => (s.stage = el)"
    class="loom-stage absolute inset-0 flex flex-col overflow-auto px-6 pt-24 pb-24"
    @click.capture="s.onStageClick"
    @dragstart.capture="$event.preventDefault()"
  >
    <component :is="'style'">{{ selectionCss }}</component>
    <!-- The widget at the chosen width, centred, with what it's previewing above it. -->
    <div class="loom-artboard m-auto flex max-w-full flex-col" :class="{ 'w-full': !s.preview.viewport.width }">
      <div class="mb-2 flex items-center gap-1.5 px-1 text-[11px] text-muted select-none">
        <UIcon :name="s.preview.viewport.icon" class="size-3.5" />
        <span class="font-medium text-default">{{ s.preview.viewport.label }}</span>
        <span>{{ viewportHint(s.preview.viewport.width) }}</span>
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
          :context="s.props.context"
        />
      </div>
    </div>
  </div>
</template>
