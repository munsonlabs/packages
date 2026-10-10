<script setup>
import { defineShortcuts } from '@nuxt/ui/composables'
import DocumentBar from './bars/DocumentBar.vue'
import IdentityBar from './bars/IdentityBar.vue'
import PreviewBar from './bars/PreviewBar.vue'
import StatusHints from './bars/StatusHints.vue'
import ElementPopover from './canvas/ElementPopover.vue'
import StudioCanvas from './canvas/StudioCanvas.vue'
import { createStudio, provideStudio } from './studio'

/**
 * The editor. It builds the studio's shared state (`studio.js`), provides it to the parts
 * below, and lays them out: the canvas, three floating bars, and the element popover. Each part
 * lives in its own folder with a README.
 */

const definition = defineModel({ required: true })

const props = defineProps({
  kit: { type: Object, required: true },
  /** Data to preview with. Only the ones the widget matches are offered, while any do. */
  samples: { type: Array, required: true },
  /** What the kit's sources get as `context` in the preview. */
  context: { default: undefined },
})

const studio = createStudio(definition, props)
provideStudio(studio)

// Plain handlers don't fire while an input has focus, so Backspace in a field stays a keystroke.
defineShortcuts({
  meta_z: studio.history.undo,
  meta_shift_z: studio.history.redo,
  meta_d: studio.editing.duplicate,
  backspace: studio.editing.remove,
  delete: studio.editing.remove,
  meta_arrowup: () => studio.editing.moveBy(-1),
  meta_arrowdown: () => studio.editing.moveBy(1),
  escape: () => {
    if (studio.selection.popoverOpen) studio.selection.popoverOpen = false
    else if (studio.selection.selectedId) studio.selection.select(undefined)
  },
})
</script>

<template>
  <div class="relative h-dvh overflow-hidden bg-muted text-default">
    <StudioCanvas />

    <IdentityBar><slot name="actions" /></IdentityBar>
    <PreviewBar />
    <DocumentBar />
    <StatusHints />

    <ElementPopover />
  </div>
</template>

<style>
.loom-bar {
  background: color-mix(in oklab, var(--ui-bg) 88%, transparent);
  backdrop-filter: blur(12px);
  box-shadow:
    0 0 0 1px var(--ui-border),
    0 8px 24px -12px rgb(0 0 0 / 0.35);
}

/* The canvas: faint dots that scroll with the content. */
.loom-stage {
  background-color: var(--ui-bg-muted);
  background-image: radial-gradient(color-mix(in oklab, var(--ui-text-dimmed) 22%, transparent) 0.6px, transparent 0.9px);
  background-size: 16px 16px;
  background-attachment: local;
}

.loom-stage [data-node-id] {
  cursor: default;
}

.loom-stage [data-node-id]:hover {
  outline: 1px dashed var(--ui-primary);
  outline-offset: 3px;
}

/* An empty container would be zero-sized and unclickable. */
.loom-stage [data-node-id]:empty:not(img, hr, .w-spacer) {
  min-height: 28px;
  outline: 1px dashed var(--ui-border-accented);
}
</style>
