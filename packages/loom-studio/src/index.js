/**
 * The editor, and the two dialogs apps open themselves, since their library is theirs to change:
 * the kind picker for a new widget, and the kind editor. Everything else is the editor's own; building a different editor starts from
 * `@munsonlabs/loom/editor`.
 */
export { default as LoomStudio } from './LoomStudio.vue'
export { default as NewWidgetModal } from './dialogs/NewWidgetModal.vue'
export { default as KindModal } from './dialogs/KindModal.vue'
