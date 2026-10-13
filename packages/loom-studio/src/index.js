/**
 * The editor, and the dialog apps open themselves, since their library is theirs to change: a new
 * widget, named, started blank or from another, and told which data it's for. Everything else is
 * the editor's own; building a different editor starts from `@munsonlabs/loom/editor`.
 */
export { default as LoomStudio } from './LoomStudio.vue'
export { default as NewWidgetModal } from './dialogs/NewWidgetModal.vue'
