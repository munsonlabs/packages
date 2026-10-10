/** The kit: what an app plugs in. Its sources (composables) and extra blocks. */

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
 * @template [TData=any]
 * @template [TContext=any]
 * @typedef {object} KitOptions
 * @property {Source<TData, TContext>[]} [sources]
 * @property {BlockSpec[]} [blocks]
 * @property {(data: TData) => string} [describe] A short label for a piece of data: sample pickers, logs.
 */

/**
 * @template [TData=any]
 * @template [TContext=any]
 * @typedef {object} Kit
 * @property {Readonly<Record<string, Source<TData, TContext>>>} sources
 * @property {Readonly<Record<string, BlockSpec>>} blocks Built-ins plus the kit's own.
 * @property {(data: TData) => string} describe
 */
