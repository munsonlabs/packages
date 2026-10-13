import { compileKind, getKind, KIND_OPS, resolveKinds } from '../kit'
import { hasErrors } from './validate'

/**
 * Checks a kind written as JSON against a kit: what it extends, its conditions, its sources and
 * its starter. Its id mustn't be taken, so when re-checking a kind already in the kit, leave it out first.
 *
 * @param {Kit} kit
 * @param {KindSpec} spec
 * @returns {ValidationIssue[]}
 */
export function validateKind(kit, spec) {
  const issues = []
  const error = (message) => issues.push({ message })
  const warn = (message) => issues.push({ message, severity: 'warning' })

  if (!spec || typeof spec !== 'object') return [{ message: 'Not a kind' }]
  if (typeof spec.id !== 'string' || !spec.id) error('Needs an id')
  else if (getKind(kit, spec.id)) error(`The id "${spec.id}" is already a kind`)
  if (typeof spec.label !== 'string' || !spec.label.trim()) error('Needs a label')

  const where = spec.where ?? []
  if (!Array.isArray(where)) error('"where" must be a list of conditions')
  if (spec.extends && !getKind(kit, spec.extends)) error(`Extends "${spec.extends}", which isn't a kind here`)
  if (!spec.extends) {
    if (!where.length) error('Needs a condition, or a kind to extend: otherwise it matches everything')
    if (!spec.starter) error('Needs a starter, or a kind to extend')
  } else if (!where.length) warn(`Has no conditions, so it takes everything "${spec.extends}" matches`)

  if (Array.isArray(where)) {
    where.forEach((c, i) => {
      const at = `Condition ${i + 1}`
      if (typeof c?.path !== 'string' || !c.path.replace(/^!/, '')) return error(`${at} needs a path`)
      if (!KIND_OPS.includes(c.op)) return error(`${at} has an unknown test "${String(c.op)}"`)
      if (c.op === 'in' && !Array.isArray(c.value)) error(`${at} needs a list of values`)
      if ((c.op === 'equals' || c.op === 'includes') && c.value === undefined) error(`${at} needs a value`)
    })
  }

  for (const id of spec.sources ?? []) if (!kit.sources[id]) warn(`Suggests the source "${id}", which this kit doesn't have`)
  if (spec.starter !== undefined && (typeof spec.starter?.root !== 'object' || spec.starter.root === null)) error('Its starter needs a root')
  return issues
}

/**
 * The kit with kinds written as JSON added, in order: each may extend a kit kind or one before
 * it. Throws on a kind with errors; `loadLibrary` checks first and skips those instead.
 *
 * @param {Kit} kit
 * @param {KindSpec[]} specs
 * @returns {Kit}
 */
export function withKinds(kit, specs) {
  let next = kit
  for (const spec of specs) {
    const issues = validateKind(next, spec)
    if (hasErrors(issues)) throw new Error(`[loom] kind "${spec?.id}": ${issues.find((i) => i.severity !== 'warning').message}`)
    next = { ...next, kinds: [...next.kinds, ...resolveKinds([compileKind(spec)], next.kinds)] }
  }
  return next
}
