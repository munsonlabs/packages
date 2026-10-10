import './theme/styles.css'

/**
 * What an app needs: make a kit, render widgets.
 */

export * from './types'
export { createKit, provideKit } from './kit'
export { default as Widget } from './Widget.vue'
