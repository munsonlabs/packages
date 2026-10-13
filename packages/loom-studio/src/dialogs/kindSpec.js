/** Helpers for the kind editor: what samples offer to test, and condition values as typed. */

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

/** A definition without its identity: what a kind's `starter` holds. */
export function starterFrom(definition) {
  const { version: _, id: __, name: ___, kind: ____, ...rest } = JSON.parse(JSON.stringify(definition))
  return rest
}
