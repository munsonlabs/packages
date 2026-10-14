import { inject, provide } from 'vue'

/**
 * What a `<Widget>` tells the Widget blocks inside it, so each can render another widget the same
 * way: the component itself, its kit, library, context, theme and scheme, how deep it is, and the
 * widgets above it. A widget never renders inside itself, and nesting stops at `MAX_DEPTH`.
 *
 * @typedef {object} Nesting
 * @property {import('vue').Component} component `<Widget>`, handed down rather than imported, which would be a cycle.
 * @property {number} depth 0 for a widget an app renders, 1 for one inside it, and so on.
 * @property {string[]} ancestors Ids of the widgets rendering this one, outermost first, and its own.
 * @property {Kit} kit
 * @property {WidgetDefinition[] | undefined} definitions The library nested widgets are picked from.
 * @property {unknown} context
 * @property {string | undefined} theme
 * @property {'light' | 'dark'} scheme
 */

export const MAX_DEPTH = 4

const NESTING = Symbol('loom-nesting')

/** @param {Nesting} nesting */
export const provideNesting = (nesting) => provide(NESTING, nesting)

/** @returns {Nesting | undefined} The widget this one is inside, if any. */
export const injectNesting = () => inject(NESTING, undefined)
