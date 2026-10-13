/** Helpers for editing a widget's `match`: conditions as form rows and back, paths to suggest from the samples, and a summary. */

/** How each test reads in a sentence. */
export const OP_LABELS = { equals: 'is', in: 'is one of', includes: 'contains', exists: 'is set' }
/** The same, negated. */
export const NEGATED_OP_LABELS = { equals: 'is not', in: 'is not one of', includes: "doesn't contain", exists: "isn't set" }

/**
 * Every dotted path to a value in the samples, for a condition's path field. Lists are values
 * (a condition can test whether one `includes` something), so their items aren't walked.
 *
 * @param {unknown[]} samples
 * @param {number} [depth=4]
 * @returns {string[]}
 */
export function samplePaths(samples, depth = 4) {
  const paths = new Set()
  const walk = (value, prefix, level) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || level >= depth) return
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key
      paths.add(path)
      walk(child, path, level + 1)
    }
  }
  for (const sample of samples) walk(sample, '', 0)
  return [...paths].sort()
}

/** A typed value as JSON when it reads as a number, boolean or null; otherwise the text itself. */
function parseScalar(text) {
  const trimmed = text.trim()
  if (/^(-?\d+(\.\d+)?|true|false|null)$/.test(trimmed)) return JSON.parse(trimmed)
  return trimmed
}

/**
 * What a condition stores for what was typed: a list for `in` (comma-separated), nothing for `exists`.
 *
 * @param {string} text
 * @param {string} op
 */
export function parseConditionValue(text, op) {
  if (op === 'exists') return undefined
  if (op === 'in')
    return text
      .split(',')
      .map(parseScalar)
      .filter((v) => v !== '')
  return parseScalar(text)
}

/**
 * A condition's value as text to edit.
 *
 * @param {unknown} value
 */
export function formatConditionValue(value) {
  if (value === undefined) return ''
  if (Array.isArray(value)) return value.map((v) => formatConditionValue(v)).join(', ')
  return typeof value === 'string' ? value : JSON.stringify(value)
}

/**
 * @typedef {object} ConditionRow A condition as the form edits it.
 * @property {boolean} negate
 * @property {string} path
 * @property {string} op
 * @property {string} text The value as typed.
 */

/** A blank row, for adding a condition. */
export const emptyRow = () => ({ negate: false, path: '', op: 'equals', text: '' })

/**
 * @param {Condition[] | undefined} match
 * @returns {ConditionRow[]}
 */
export function rowsFrom(match) {
  return (match ?? []).map((c) => ({ negate: c.path.startsWith('!'), path: c.path.replace(/^!/, ''), op: c.op, text: formatConditionValue(c.value) }))
}

/**
 * The conditions the rows describe, leaving out rows with no path yet.
 *
 * @param {ConditionRow[]} rows
 * @returns {Condition[]}
 */
export function matchFrom(rows) {
  return rows
    .filter((r) => r.path.trim())
    .map((r) => {
      const value = parseConditionValue(r.text, r.op)
      return { path: `${r.negate ? '!' : ''}${r.path.trim()}`, op: r.op, ...(value === undefined ? {} : { value }) }
    })
}

/**
 * One line for a widget's conditions: "entry.type is article", "+1 more" after the first, or "Any data".
 *
 * @param {Condition[] | undefined} match
 */
export function describeMatch(match) {
  if (!match?.length) return 'Any data'
  const [first, ...rest] = match
  const negated = first.path.startsWith('!')
  const value = first.op === 'exists' ? '' : ` ${formatConditionValue(first.value)}`
  const op = (negated ? NEGATED_OP_LABELS : OP_LABELS)[first.op] ?? first.op
  const line = `${first.path.replace(/^!/, '')} ${op}${value}`
  return rest.length ? `${line} +${rest.length}` : line
}
