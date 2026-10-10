/**
 * `@munsonlabs/loom/editor`: what an editor needs beyond rendering. Listing what a field can
 * bind to, which data a widget matches, defaults for new nodes. An app that only renders widgets never needs them.
 */

export { bindableValues } from './definitions/paths'
export { parseAction } from './definitions/validate'
export { conditionHolds, CONDITION_OPS, definitionMatches } from './definitions/match'
export { blockDefaults } from './kit'
