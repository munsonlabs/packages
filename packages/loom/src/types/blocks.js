/** Blocks: the building pieces of a definition. The built-ins render in `blocks/builtin/`. */

/**
 * A block's name: one of the keys of `builtinBlocks`.
 *
 * @typedef {string} BlockType
 */

/**
 * @typedef {object} BlockPropSpec
 * @property {'string' | 'number' | 'boolean' | 'enum'} type
 * @property {string} label
 * @property {string[]} [options]
 * @property {unknown} [default]
 * @property {ValueType[]} [accepts] Field types this prop can be bound to. Omitted means static only.
 */

/**
 * @typedef {object} BlockSpec
 * @property {BlockType} type
 * @property {string} label
 * @property {string} description
 * @property {string} [icon] An Iconify name for editors, e.g. `i-lucide-type`.
 * @property {boolean} container
 * @property {Record<string, BlockPropSpec>} props
 */
