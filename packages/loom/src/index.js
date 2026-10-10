import './theme/styles.css'

/**
 * What an app needs: make a kit, validate definitions, render widgets. Editors (or your own)
 * get the lower-level helpers from `@munsonlabs/loom/editor`.
 */

export * from './types'
export { createKit, defineSource, provideKit } from './kit'
export { validateDefinition } from './definitions/validate'
export { default as Widget } from './Widget.vue'
