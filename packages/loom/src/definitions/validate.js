import { DEFINITION_VERSION } from '../types'
import { getKind } from '../kit'
import { pathType } from './paths'
import { applyVariant, BASE_VARIANT } from './variants'

/**
 * @typedef {object} ValidationIssue
 * @property {string} [nodeId]
 * @property {string} [variant] Set when the issue only exists in this variant.
 * @property {string} message
 */

const SIZES = ['sm', 'md', 'lg']

/**
 * @param {ActionBinding} binding
 * @returns {{ action: string; arg?: string }}
 */
export function parseAction(binding) {
  return typeof binding === 'string' ? { action: binding } : binding
}

/**
 * Checks a definition against a kit: every block, bound path, action and condition must exist
 * and fit where it's used, in the base and in every variant. An empty result means it renders
 * as written.
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
  if (definition.kind && !getKind(kit, definition.kind)) issues.push({ message: `Unknown kind "${definition.kind}"` })
  issues.push(...validateTree(kit, definition))
  issues.push(...validateVariants(kit, definition, issues))
  return issues
}

function validateVariants(kit, definition, baseIssues) {
  const issues = []
  const ids = new Set()
  const known = new Set(baseIssues.map((i) => `${i.nodeId}|${i.message}`))

  for (const variant of definition.variants ?? []) {
    const at = (message, nodeId) => issues.push({ variant: variant.id, nodeId, message })
    if (variant.id === BASE_VARIANT || ids.has(variant.id)) at(`Variant id "${variant.id}" is reserved or already used`)
    ids.add(variant.id)

    const rule = variant.when
    if (rule?.if) {
      const type = pathType(kit, definition, definition.root.id, rule.if)
      if (!type) at(`Rule "${rule.if}" isn't in scope`)
      else if (type === 'action') at(`Can't use action "${rule.if}" as a rule`)
    }
    for (const size of rule?.size ?? []) if (!SIZES.includes(size)) at(`Unknown size "${size}"`)

    for (const [nodeId, override] of Object.entries(variant.overrides ?? {})) {
      const node = findNode(definition.root, nodeId)
      if (!node) {
        at(`Overrides a node that doesn't exist`, nodeId)
        continue
      }
      for (const id of override.order ?? []) {
        if (!node.children?.some((c) => c.id === id)) at(`Orders "${id}", which isn't a child`, nodeId)
      }
    }

    // Overrides can rebind anything, so check the tree this variant actually renders; report only what's new to it.
    for (const issue of validateTree(kit, applyVariant(definition, variant.id))) {
      if (!known.has(`${issue.nodeId}|${issue.message}`)) issues.push({ ...issue, variant: variant.id })
    }
  }
  return issues
}

function findNode(root, id) {
  if (root.id === id) return root
  for (const child of root.children ?? []) {
    const found = findNode(child, id)
    if (found) return found
  }
  return undefined
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
        if (!type) at(`"${path}" isn't in scope`)
        else if (type === 'action' || !propSpec.accepts.includes(type)) at(`${node.type}.${prop} can't take a ${type} ("${path}")`)
      }
    }

    for (const [event, binding] of Object.entries(node.on ?? {})) {
      if (event !== 'click') at(`Widgets only handle "click", not "${event}"`)
      else if (!spec.clickable) at(`${node.type} can't be tapped`)
      const { action, arg } = parseAction(binding)
      const type = pathType(kit, definition, node.id, action)
      if (type !== 'action') at(`"${action}" isn't an action in scope`)
      if (arg && !pathType(kit, definition, node.id, arg)) at(`"${arg}" isn't in scope`)
    }

    if (node.if) {
      const type = pathType(kit, definition, node.id, node.if)
      if (!type) at(`"${node.if}" isn't in scope`)
      else if (type === 'action') at(`Can't use action "${node.if}" as a condition`)
    }

    if (node.children?.length && !spec.container) at(`${node.type} can't have children`)
    node.children?.forEach(visit)
  }
  visit(definition.root)
  return issues
}
