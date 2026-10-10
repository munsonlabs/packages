/** Blocks: the building pieces of a definition. The built-ins render in `blocks/builtin/`; a kit can add its own. */

/**
 * A block's name: a built-in's (the keys of `builtinBlocks`) or one a kit adds. Just a string,
 * since a kit can add any.
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
 * @property {TokenScale} [tokenScale] A token scale editors offer steps from, e.g. `space` for a gap: `var(--w-space-3)`.
 */

/**
 * @typedef {object} BlockSpec
 * @property {BlockType} type
 * @property {string} label
 * @property {string} description
 * @property {string} [icon] An Iconify name for editors, e.g. `i-lucide-type`.
 * @property {boolean} container
 * @property {Record<string, BlockPropSpec>} props
 * @property {boolean} [clickable] Can be tapped: its node's `on.click` runs an action. Taps are the only event widgets have.
 * @property {Component} [component] Draws the block: a built-in's SFC, or a kit's own component. It receives the resolved prop values as props, plus the node's
 *   `data-node-id`, class, style and `onClick` as attrs, which it should let fall through to its
 *   root. Every block in a kit has one; a built-in's SFC exports its spec without it, and `builtinBlocks` adds it.
 */
