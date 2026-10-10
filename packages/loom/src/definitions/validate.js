import { DEFINITION_VERSION } from '../types'
import { parsePath, pathType } from './paths'
import { validateMatch } from './match'

/**
 * @typedef {object} ValidationIssue
 * @property {string} [nodeId]
 * @property {string} message
 */

/**
 * @param {ActionBinding} binding
 * @returns {{ action: string; arg?: string }}
 */
export function parseAction(binding) {
  return typeof binding === 'string' ? { action: binding } : binding
}

/** Why a path is out of scope: its source is one the widget doesn't `use`, or there's no such value. */
function outOfScope(kit, definition, path, problem = "isn't in scope") {
  const { source } = parsePath(path)
  return definition.uses && kit.sources[source] && !definition.uses.includes(source)
    ? `"${path}" is from "${source}", which this widget doesn't use`
    : `"${path}" ${problem}`
}

/**
 * Checks a definition against a kit: every block, bound path, action and condition must exist
 * and fit where it's used. An empty result means it renders as written.
 *
 * @param {Kit} kit
 * @param {WidgetDefinition} definition
 * @returns {ValidationIssue[]}
 */
export function validateDefinition(kit, definition) {
  const issues = []
  if (definition.version !== DEFINITION_VERSION) {
    issues.push({ message: `Unsupported version ${String(definition.version)}, expected ${String(DEFINITION_VERSION)}` })
  }
  issues.push(...validateMatch(definition))
  for (const id of definition.uses ?? []) if (!kit.sources[id]) issues.push({ message: `Uses "${id}", which this kit doesn't have` })
  issues.push(...validateTree(kit, definition))
  return issues
}

function validateTree(kit, definition) {
  const issues = []
  const seen = new Set()
  const visit = (node) => {
    const at = (message) => issues.push({ nodeId: node.id, message })
    if (seen.has(node.id)) at(`Duplicate node id "${node.id}"`)
    seen.add(node.id)

    const spec = kit.blocks[node.type]
    if (!spec) return at(`Unknown block "${node.type}"`)

    for (const [prop, path] of Object.entries(node.bind ?? {})) {
      const propSpec = spec.props[prop]
      if (!propSpec) at(`${node.type} has no prop "${prop}"`)
      else if (!propSpec.accepts) at(`${node.type}.${prop} can't be bound`)
      else {
        const type = pathType(kit, definition, node.id, path)
        if (!type) at(outOfScope(kit, definition, path))
        else if (type === 'action' || !propSpec.accepts.includes(type)) at(`${node.type}.${prop} can't take a ${type} ("${path}")`)
      }
    }

    for (const [event, binding] of Object.entries(node.on ?? {})) {
      if (event !== 'click') at(`Widgets only handle "click", not "${event}"`)
      else if (!spec.clickable) at(`${node.type} can't be tapped`)
      const { action, arg } = parseAction(binding)
      const type = pathType(kit, definition, node.id, action)
      if (!type) at(outOfScope(kit, definition, action, "isn't an action in scope"))
      else if (type !== 'action') at(`"${action}" isn't an action in scope`)
      if (arg && !pathType(kit, definition, node.id, arg)) at(outOfScope(kit, definition, arg))
    }

    if (node.if) {
      const type = pathType(kit, definition, node.id, node.if)
      if (!type) at(outOfScope(kit, definition, node.if))
      else if (type === 'action') at(`Can't use action "${node.if}" as a condition`)
    }

    if (node.children?.length && !spec.container) at(`${node.type} can't have children`)
    node.children?.forEach(visit)
  }
  visit(definition.root)
  return issues
}
