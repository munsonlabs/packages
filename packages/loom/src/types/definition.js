/**
 * A widget definition is plain JSON: a tree of blocks whose props bind to the fields of the
 * kit's sources. `<Widget>` interprets it at runtime; nothing is compiled, so a definition can
 * only reach what its kit exposes.
 */

export const DEFINITION_VERSION = 2

/**
 * `"<source>.<field>"`, optionally with a deeper path: `"item.title"`.
 *
 * @typedef {string} ValuePath
 */

/**
 * An action path, or an action path plus a value path passed as its only argument.
 *
 * @typedef {ValuePath | { action: ValuePath; arg?: ValuePath }} ActionBinding
 */

/**
 * @typedef {object} WidgetNode
 * @property {string} id
 * @property {BlockType} type
 * @property {Record<string, unknown>} [props] Static prop values. A prop also listed in `bind` takes the bound value.
 * @property {Record<string, ValuePath>} [bind] Prop name → value path.
 * @property {Record<string, ActionBinding>} [on] Event name → action.
 * @property {ValuePath} [if] Value path that must be truthy for the node to render. Prefix with `!` to negate.
 * @property {Record<string, string>} [style] Inline CSS declarations. Values may use the definition's vars: `var(--w-accent)`.
 * @property {WidgetNode[]} [children]
 */

/**
 * @typedef {object} WidgetDefinition
 * @property {typeof DEFINITION_VERSION} version
 * @property {string} id
 * @property {string} name
 * @property {Record<string, string>} [vars] CSS custom properties set on the widget root.
 * @property {WidgetNode} root
 */
