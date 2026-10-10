/**
 * Which widget renders some data. A definition's `match` is a list of conditions on the raw data,
 * before any source runs; every one must hold. Among several definitions, the first that matches wins.
 */

/** What a condition can test. `!` before its path negates it. */
export const CONDITION_OPS = ['equals', 'in', 'includes', 'exists']

function readDataPath(data, path) {
  let value = data
  for (const key of path.split('.')) {
    if (value == null || typeof value !== 'object') return undefined
    value = value[key]
  }
  return value
}

/**
 * Whether data meets one condition.
 *
 * @param {Condition} condition
 * @param {unknown} data
 */
export function conditionHolds(condition, data) {
  const negated = condition.path.startsWith('!')
  const value = readDataPath(data, negated ? condition.path.slice(1) : condition.path)
  const expected = condition.value
  let holds = false
  if (condition.op === 'equals') holds = value === expected
  else if (condition.op === 'in') holds = Array.isArray(expected) && expected.includes(value)
  else if (condition.op === 'includes') holds = (Array.isArray(value) || typeof value === 'string') && value.includes(expected)
  else if (condition.op === 'exists') holds = value != null
  return negated ? !holds : holds
}

/**
 * Whether a definition is for some data: every condition in its `match` holds. One with no
 * conditions takes anything.
 *
 * @param {WidgetDefinition} definition
 * @param {unknown} data
 */
export function definitionMatches(definition, data) {
  return (definition.match ?? []).every((c) => conditionHolds(c, data))
}

/**
 * The definition to render some data with: the first whose `match` holds for it.
 *
 * @template TData
 * @param {TData} data
 * @param {WidgetDefinition[]} definitions
 * @returns {WidgetDefinition | undefined}
 */
export function matchDefinition(data, definitions) {
  return definitions.find((d) => definitionMatches(d, data))
}

/**
 * Checks a definition's `match`: each condition needs a path, a known test and the value that test takes.
 *
 * @param {WidgetDefinition} definition
 * @returns {ValidationIssue[]}
 */
export function validateMatch(definition) {
  if (definition.match === undefined) return []
  if (!Array.isArray(definition.match)) return [{ message: '"match" must be a list of conditions' }]
  const issues = []
  definition.match.forEach((c, i) => {
    const at = (message) => issues.push({ message: `Condition ${i + 1} ${message}` })
    if (typeof c?.path !== 'string' || !c.path.replace(/^!/, '')) return at('needs a path')
    if (!CONDITION_OPS.includes(c.op)) return at(`has an unknown test "${String(c.op)}"`)
    if (c.op === 'in' && !Array.isArray(c.value)) at('needs a list of values')
    if ((c.op === 'equals' || c.op === 'includes') && c.value === undefined) at('needs a value')
  })
  return issues
}
