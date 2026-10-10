/**
 * The editor, and the new-widget dialog apps open themselves (adding a widget to a library is
 * theirs to do). Everything else is the editor's own; building a different editor starts from
 * `@munsonlabs/loom/editor`.
 */
export { default as LoomStudio } from './LoomStudio.vue'
export { default as NewWidgetModal } from './dialogs/NewWidgetModal.vue'
