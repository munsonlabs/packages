/** A kit's guard: one function that sees every action before any widget runs it. */

/**
 * One action a widget is about to run, as a kit's `guard` sees it.
 *
 * @template [TData=any]
 * @template [TContext=any]
 * @typedef {object} GuardedAction
 * @property {string} action The bound path: `actions.open`.
 * @property {unknown} [arg] The argument it will get, already resolved (a Repeat's `item`, say), if it has one.
 * @property {string} node The node that was clicked.
 * @property {TData} data The widget's data, index and context, as sources get them.
 * @property {number} index
 * @property {TContext} context
 */

/**
 * @template [TData=any]
 * @template [TContext=any]
 * @typedef {(action: GuardedAction<TData, TContext>) => boolean | void | Promise<boolean | void>} ActionGuard
 */
