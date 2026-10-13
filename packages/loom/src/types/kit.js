/** The kit: what an app plugs in. Its sources (composables), extra blocks, themes and guard. */

/** @typedef {'string' | 'number' | 'boolean' | 'list' | 'object'} ValueType */
/** @typedef {ValueType | 'action'} FieldType */

/**
 * @typedef {object} FieldSpec
 * @property {FieldType} type
 * @property {string} [description]
 * @property {Record<string, ValueType>} [item] For `list` fields: what each item exposes inside a `Repeat`, as path → type. `''` is the item itself.
 */

/**
 * What a source's `setup` gets. `data` and `index` are read-only refs, so it can be destructured and
 * handed to composables that take refs or getters (`toValue` reads either).
 *
 * @template [TData=any]
 * @template [TContext=any]
 * @typedef {object} SourceContext
 * @property {Readonly<import('vue').Ref<TData>>} data
 * @property {Readonly<import('vue').Ref<number>>} index
 * @property {TContext} context The widget's context as it was when the source set up. Keep what changes reactive inside it.
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
 * @property {string} [id] Names the kit, so a published library records which kit it was made for and a loader can check.
 * @property {Source<TData, TContext>[]} [sources]
 * @property {BlockSpec[]} [blocks]
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
 * @property {readonly Theme[]} themes At least one: the light theme when the kit gives none.
 * @property {(data: TData) => string} describe
 * @property {ActionGuard<TData, TContext>} [guard]
 */
