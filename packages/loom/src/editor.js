/**
 * `@munsonlabs/loom/editor`: what an editor needs beyond rendering. Listing what a field can
 * bind to, applying variants, defaults for new nodes. An app that only renders widgets never needs them.
 */

export { bindableValues } from './definitions/paths'
export { parseAction } from './definitions/validate'
export { conditionHolds, CONDITION_OPS, definitionMatches } from './definitions/match'
export { BASE_VARIANT, findVariant, variantTree, applyVariant, widthToSize } from './definitions/variants'
export { blockDefaults } from './kit'
