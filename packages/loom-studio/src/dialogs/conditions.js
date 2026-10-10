/** A widget's `match` in words: for summaries of when it renders. */

/** How each test reads in a sentence. */
export const OP_LABELS = { equals: 'is', in: 'is one of', includes: 'contains', exists: 'is set' }
/** The same, negated. */
export const NEGATED_OP_LABELS = { equals: 'is not', in: 'is not one of', includes: "doesn't contain", exists: "isn't set" }

/**
 * A condition's value as text.
 *
 * @param {unknown} value
 */
export function formatConditionValue(value) {
  if (value === undefined) return ''
  if (Array.isArray(value)) return value.map((v) => formatConditionValue(v)).join(', ')
  return typeof value === 'string' ? value : JSON.stringify(value)
}

/**
 * One condition as a phrase: "entry.type is article".
 *
 * @param {Condition} condition
 */
export function describeCondition(condition) {
  const negated = condition.path.startsWith('!')
  const value = condition.op === 'exists' ? '' : ` ${formatConditionValue(condition.value)}`
  const op = (negated ? NEGATED_OP_LABELS : OP_LABELS)[condition.op] ?? condition.op
  return `${condition.path.replace(/^!/, '')} ${op}${value}`
}

/**
 * One line for a widget's conditions: "entry.type is article", "+1 more" after the first, or "Any data".
 *
 * @param {Condition[] | undefined} match
 */
export function describeMatch(match) {
  if (!match?.length) return 'Any data'
  const [first, ...rest] = match
  return rest.length ? `${describeCondition(first)} +${rest.length}` : describeCondition(first)
}
