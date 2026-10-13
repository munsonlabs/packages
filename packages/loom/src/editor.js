/**
 * `@munsonlabs/loom/editor`: what an editor needs beyond rendering. Listing what a field can
 * bind to, applying and diffing variants, the token scales, defaults for new nodes. Loom Studio
 * is built on these; an app that only renders widgets never needs them.
 */

export { bindableValues } from './definitions/paths'
export { parseAction } from './definitions/validate'
export { shadowedWidgets } from './definitions/library'
export { BASE_VARIANT, findVariant, variantTree, applyVariant, diffAsOverride, widthToSize } from './definitions/variants'
export { blockDefaults, createDefinition, conditionHolds, KIND_OPS } from './kit'
export { tokens, scaleForRole, scaleTokens, tokenVar } from './theme/tokens'
export { themeForScheme, usePreferredScheme } from './theme/scheme'
export { parseLightDark, lightDark } from './theme/lightDark'
