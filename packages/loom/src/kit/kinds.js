/**
 * Kinds that build on others, and kinds written as JSON. A kind with `extends` takes its base's
 * match as well as its own, and anything it leaves out (sources, starter, icon). A `KindSpec` is
 * the JSON form editors save in a library; `compileKind` turns one into an ordinary kind.
 */

/** What a condition can test. `!` before its path negates it. */
export const KIND_OPS = ['equals', 'in', 'includes', 'exists']

function readDataPath(data, path) {
  let value = data
  for (const key of path.split('.')) {
    if (value == null || typeof value !== 'object') return undefined
    value = value[key]
  }
  return value
}

/**
 * Whether data meets one condition of a kind's `where`.
 *
 * @param {KindCondition} condition
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
 * A kind from its JSON form. Its match is only its own `where`; `resolveKinds` adds the base's.
 *
 * @param {KindSpec} spec
 * @returns {Kind}
 */
export function compileKind(spec) {
  const { where, starter, ...rest } = spec
  return {
    ...rest,
    ...(where?.length ? { matches: (data) => where.every((c) => conditionHolds(c, data)) } : {}),
    ...(starter ? { starter: () => structuredClone(starter) } : {}),
    crafted: spec,
  }
}

/**
 * Fills in each kind from its base: the base's match runs first, and the base's sources, starter
 * and icon stand in for any the kind leaves out. A base must be in `known` or earlier in `kinds`.
 *
 * @param {Kind[]} kinds
 * @param {readonly Kind[]} [known=[]] Kinds already resolved, such as a kit's.
 * @returns {Kind[]}
 */
export function resolveKinds(kinds, known = []) {
  const byId = new Map(known.map((k) => [k.id, k]))
  return kinds.map((kind) => {
    if (byId.has(kind.id)) throw new Error(`[loom] two kinds share the id "${kind.id}"`)
    const base = kind.extends ? byId.get(kind.extends) : undefined
    if (kind.extends && !base) throw new Error(`[loom] kind "${kind.id}" extends "${kind.extends}", which isn't before it`)
    if (!base && !kind.matches) throw new Error(`[loom] kind "${kind.id}" needs matches or a kind to extend`)
    const own = kind.matches
    const resolved = base
      ? {
          ...kind,
          matches: own ? (data) => base.matches(data) && own(data) : base.matches,
          sources: kind.sources ?? base.sources,
          starter: kind.starter ?? base.starter,
          icon: kind.icon ?? base.icon,
        }
      : kind
    byId.set(kind.id, resolved)
    return resolved
  })
}

/**
 * How many kinds deep a kind is: 0 for one that extends nothing. Deeper kinds are more specific,
 * so they win when several match.
 *
 * @param {Kit} kit
 * @param {Kind} kind
 */
export function kindDepth(kit, kind) {
  let depth = 0
  for (let k = kind; k?.extends; k = kit.kinds.find((other) => other.id === k.extends)) depth++
  return depth
}
