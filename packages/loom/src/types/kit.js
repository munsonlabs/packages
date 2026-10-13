/** The kit: what an app plugs in. Its sources (composables), extra blocks, kinds of data, themes and guard. */

/** @typedef {'string' | 'number' | 'boolean' | 'list' | 'object'} ValueType */
/** @typedef {ValueType | 'action'} FieldType */

/**
 * @typedef {object} FieldSpec
 * @property {FieldType} type
 * @property {string} [description]
 * @property {Record<string, ValueType>} [item] For `list` fields: what each item exposes inside a `Repeat`, as path → type. `''` is the item itself.
 */

/**
 * What a source's `setup` gets. Getters, so composables that read them inside `computed` stay reactive.
 *
 * @template [TData=any]
 * @template [TContext=any]
 * @typedef {object} SourceContext
 * @property {TData} data
 * @property {number} index
 * @property {TContext} context
 */

/**
 * A named set of values and actions widgets can bind to, usually one composable. `setup` runs
 * once per rendered widget, the first time a binding reaches it, inside the widget's effect scope.
 *
 * @template [TData=any]
 * @template [TContext=any]
 * @typedef {object} Source
 * @property {string} id
 * @property {string} label
 * @property {string} [description]
 * @property {boolean} [primary] Listed first in editors. Use for the data's own fields.
 * @property {Record<string, FieldSpec>} fields
 * @property {(ctx: SourceContext<TData, TContext>) => Record<string, unknown>} setup
 */

/**
 * A kind of data and how to build a widget for it: which data it covers, which sources suit
 * it, and the definition a new widget of this kind starts from.
 *
 * @template [TData=any]
 * @typedef {object} Kind
 * @property {string} id
 * @property {string} label
 * @property {string} [description]
 * @property {string} [icon]
 * @property {string} [extends] A kind this one narrows, listed before it. Data must match the base as well, and the base's sources, starter and
 *   icon stand in for any this one leaves out. Deeper kinds win when several match.
 * @property {(data: TData) => boolean} [matches] Required unless it extends a kind.
 * @property {string[]} [sources] Sources editors list first for this kind.
 * @property {() => Omit<WidgetDefinition, 'version' | 'id' | 'name' | 'kind'>} [starter] Required unless it extends a kind.
 * @property {KindSpec} [crafted] The JSON it was made from, when it was made in an editor.
 */

/**
 * A kind as JSON, so an editor can make one and a library can carry it. It narrows a kit kind
 * (`extends`) with conditions on the data, or stands alone on its conditions.
 *
 * @typedef {object} KindSpec
 * @property {string} id
 * @property {string} label
 * @property {string} [description]
 * @property {string} [icon]
 * @property {string} [extends]
 * @property {KindCondition[]} [where] Every one must hold. Required unless it extends a kind.
 * @property {string[]} [sources]
 * @property {Omit<WidgetDefinition, 'version' | 'id' | 'name' | 'kind'>} [starter] Required unless it extends a kind.
 */

/**
 * A test on the raw data, before any source runs: `{ "path": "entry.tags", "op": "includes", "value": "breaking" }`.
 *
 * @typedef {object} KindCondition
 * @property {string} path A dotted path into the data. Prefix with `!` to negate the condition.
 * @property {'equals' | 'in' | 'includes' | 'exists'} op `in` takes a list of values; `includes` tests a list or a string; `exists` takes no value.
 * @property {unknown} [value]
 */

/**
 * @template [TData=any]
 * @template [TContext=any]
 * @typedef {object} KitOptions
 * @property {string} [id] Names the kit, so a published library records which kit it was made for and a loader can check.
 * @property {Source<TData, TContext>[]} [sources]
 * @property {BlockSpec[]} [blocks]
 * @property {Kind<TData>[]} [kinds]
 * @property {(data: TData) => string} [describe] A short label for a piece of data: sample pickers, logs.
 * @property {Theme[]} [themes] Token values for widgets to start from. The first is the default; `<Widget theme>` picks another.
 * @property {ActionGuard<TData, TContext>} [guard] Runs before every action any widget triggers. Return `false` to stop it (and do something
 *   else instead, like showing a paywall), anything else to let it run. May return a promise:
 *   the action runs once it resolves to anything but `false`.
 */

/**
 * @template [TData=any]
 * @template [TContext=any]
 * @typedef {object} Kit
 * @property {string} [id]
 * @property {Readonly<Record<string, Source<TData, TContext>>>} sources
 * @property {Readonly<Record<string, BlockSpec>>} blocks Built-ins plus the kit's own.
 * @property {readonly Kind<TData>[]} kinds
 * @property {readonly Theme[]} themes At least one: the light theme when the kit gives none.
 * @property {(data: TData) => string} describe
 * @property {ActionGuard<TData, TContext>} [guard]
 */
