import './theme/styles.css'

/**
 * What an app needs: make a kit, render widgets.
 */

export * from './types'
export { createKit, defineSource, provideKit } from './kit'
export { default as Widget } from './Widget.vue'
