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
 * @property {Condition[]} [match] Which data it's for: every condition must hold. `<Widget :definitions>` renders the first definition that matches; none means any data.
 * @property {string[]} [uses] The sources it binds to. Editors offer only these, and binding to another is out of scope. Unset means every source in the kit.
 * @property {Record<string, string>} [vars] CSS custom properties set on the widget root.
 * @property {WidgetNode} root
 * @property {WidgetVariant[]} [variants] Alternatives to the base tree. The first whose `when` matches is applied; none matching renders the base.
 */

/**
 * A variant is a diff on the base tree, keyed by node id. Structure (adding, removing, nesting)
 * belongs to the base, so every variant shares node ids and stays a small, reviewable diff.
 *
 * @typedef {object} WidgetVariant
 * @property {string} id
 * @property {string} label
 * @property {VariantRule} [when]
 * @property {Record<string, string>} [vars] Merged over the definition's vars.
 * @property {Record<string, NodeOverride>} [overrides]
 */

/**
 * Every given condition must hold. A rule with no conditions never matches on its own: pin it with the `variant` prop.
 *
 * @typedef {object} VariantRule
 * @property {ValuePath} [if] Value path that must be truthy, `!` to negate: `"product.onSale"`.
 * @property {WidgetSize[]} [size] The widget's measured size bucket.
 * @property {number} [minWidth]
 * @property {number} [maxWidth]
 */

/**
 * `sm` under 300px, `md` from 300px, `lg` from 500px, measured from the widget itself.
 *
 * @typedef {'sm' | 'md' | 'lg'} WidgetSize
 */

/**
 * Merged over a base node. `null` removes the base's entry, so a variant can unbind or drop a condition.
 *
 * @typedef {object} NodeOverride
 * @property {boolean} [hidden]
 * @property {Record<string, unknown>} [props]
 * @property {Record<string, ValuePath | null>} [bind]
 * @property {Record<string, ActionBinding | null>} [on]
 * @property {ValuePath | null} [if]
 * @property {Record<string, string | null>} [style]
 * @property {string[]} [order] Child ids to put first, in this order; unlisted children follow in base order.
 */

/**
 * A test on the raw data, before any source runs: `{ "path": "entry.tags", "op": "includes", "value": "breaking" }`.
 *
 * @typedef {object} Condition
 * @property {string} path A dotted path into the data. Prefix with `!` to negate the condition.
 * @property {'equals' | 'in' | 'includes' | 'exists'} op `in` takes a list of values; `includes` tests a list or a string; `exists` takes no value.
 * @property {unknown} [value]
 */
