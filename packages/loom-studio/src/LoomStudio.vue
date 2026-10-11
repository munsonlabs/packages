<script setup>
import { defineShortcuts } from '@nuxt/ui/composables'
import CallsLog from './bars/CallsLog.vue'
import DocumentBar from './bars/DocumentBar.vue'
import IdentityBar from './bars/IdentityBar.vue'
import PreviewBar from './bars/PreviewBar.vue'
import StatusHints from './bars/StatusHints.vue'
import ElementPopover from './canvas/ElementPopover.vue'
import StudioCanvas from './canvas/StudioCanvas.vue'
import CommandPalette from './dialogs/CommandPalette.vue'
import ExportModal from './dialogs/ExportModal.vue'
import ImportModal from './dialogs/ImportModal.vue'
import LayersPanel from './layers/LayersPanel.vue'
import { frameModes } from './preview/frames'
import { createStudio, provideStudio } from './studio'
import TourPopover from './tour/TourPopover.vue'

/**
 * The editor. It builds the studio's shared state (`studio.js`), provides it to the parts
 * below, and lays them out: the canvas, the layers panel, four floating bars, the element
 * popover, and the dialogs. Each part lives in its own folder with a README.
 */

const definition = defineModel({ required: true })

const props = defineProps({
  kit: { type: Object, required: true },
  /** Data to preview with. Only the ones the widget matches are offered, while any do. */
  samples: { type: Array, required: true },
  /** What the kit's sources get as `context` in the preview. Every function called on it is logged. */
  context: { default: undefined },
  /** Starts the guided tour on a first visit (remembered per browser). The help button replays it either way. */
  tour: { type: Boolean, default: true },
  /** Every widget in the app's library, in order: offered as one file in Export. */
  library: Array,
})

const emit = defineEmits([
  'publish',
  /** A library file was imported: its loadable widgets, what was skipped, and why. The app decides what to do with them. */
  'importLibrary',
])

const studio = createStudio(definition, props, {
  publish: (d) => emit('publish', d),
  importLibrary: (library) => emit('importLibrary', library),
})
provideStudio(studio)

// Plain handlers don't fire while an input has focus, so Backspace in a field stays a keystroke.
defineShortcuts({
  meta_k: () => (studio.open.palette = true),
  l: () => (studio.open.layers = !studio.open.layers),
  f: () => {
    const i = frameModes.findIndex((m) => m.value === studio.preview.frameMode)
    studio.preview.frameMode = frameModes[(i + 1) % frameModes.length].value
  },
  meta_z: studio.history.undo,
  meta_shift_z: studio.history.redo,
  meta_d: studio.editing.duplicate,
  backspace: studio.editing.remove,
  delete: studio.editing.remove,
  meta_arrowup: () => studio.editing.moveBy(-1),
  meta_arrowdown: () => studio.editing.moveBy(1),
  escape: () => {
    if (studio.tour.open) studio.tour.finish()
    else if (studio.selection.popoverOpen) studio.selection.popoverOpen = false
    else if (studio.selection.selectedId) studio.selection.select(undefined)
  },
})
</script>

<template>
  <div class="relative h-dvh overflow-hidden bg-muted text-default">
    <StudioCanvas />
    <LayersPanel v-if="studio.open.layers" />

    <IdentityBar><slot name="actions" /></IdentityBar>
    <PreviewBar />
    <DocumentBar />
    <StatusHints />
    <CallsLog />

    <ElementPopover />
    <TourPopover />

    <CommandPalette />
    <ExportModal />
    <ImportModal />
  </div>
</template>

<style>
/* The tour rings what it points at; outlines follow each element's own radius. */
[data-tour-active] {
  outline: 2px solid var(--ui-primary) !important;
  outline-offset: 4px !important;
}

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

.loom-stage.is-editing [data-node-id] {
  cursor: default;
}

.loom-stage.is-dragging,
.loom-stage.is-dragging [data-node-id] {
  cursor: grabbing;
}

.loom-stage.is-editing [data-node-id]:hover {
  outline: 1px dashed var(--ui-primary);
  outline-offset: 3px;
}

/* Frames other than the one being edited: a click there makes it the one. */
.loom-stage .is-other-frame {
  opacity: 0.8;
  transition: opacity 150ms;
}
.loom-stage .is-other-frame:hover {
  opacity: 1;
}

/* An empty container would be zero-sized and unclickable. */
.loom-stage.is-editing [data-node-id]:empty:not(img, hr, .w-spacer) {
  min-height: 28px;
  outline: 1px dashed var(--ui-border-accented);
}
</style>
