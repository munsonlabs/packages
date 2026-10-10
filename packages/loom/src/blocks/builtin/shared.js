/**
 * A built-in block's Vue props, from the spec its SFC exports: `defineProps(blockProps(spec))`.
 * The defaults live in the spec only, so the editor and the HTML can't disagree.
 *
 * No `type`s on purpose: values arrive as bound, and Boolean casting would turn an absent prop
 * into `false` before its default applies.
 */
export function blockProps(spec) {
  return Object.fromEntries(Object.entries(spec.props).map(([name, prop]) => [name, { default: prop.default }]))
}

export const isBlank = (value) => value == null || value === ''

/** Bound values are JSON scalars; anything else (a list bound by mistake) renders as nothing. */
export const toText = (value) => (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '')

/** `start`/`end` as flexbox spells them. */
export function toFlexAlign(value) {
  return value === 'start' ? 'flex-start' : value === 'end' ? 'flex-end' : value
}
