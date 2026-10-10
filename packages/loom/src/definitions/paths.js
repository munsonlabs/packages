import { unref } from 'vue'
import { positionFields } from '../blocks/builtin/Repeat.vue'

/**
 * Value paths, shared by the renderer (values) and the editor and validator (types).
 *
 * A value path is `"<source>.<keys>"`. Sources are the kit's sources, plus `item` and `repeat` (its
 * position) inside a `Repeat`.
 * The keys walk the source's result, unwrapping Vue refs at every step.
 */

export function parsePath(path) {
  const negate = path.startsWith('!')
  const [source, ...keys] = (negate ? path.slice(1) : path).split('.')
  return { negate, source, keys }
}

export function readPath(value, keys) {
  let current = unref(value)
  for (const key of keys) {
    if (current == null) return undefined
    current = unref(current[key])
  }
  return current
}

/**
 * @typedef {object} ValueOption
 * @property {ValuePath} path
 * @property {FieldType} type
 * @property {string} source The source's id, or `item`.
 * @property {string} sourceLabel
 * @property {string} label
 * @property {string} [description]
 */

/** The `Repeat` ancestors of a node, outermost first. */
function repeatAncestors(root, id) {
  if (root.id === id) return []
  for (const child of root.children ?? []) {
    const found = repeatAncestors(child, id)
    if (found) return root.type === 'Repeat' ? [root, ...found] : found
  }
  return undefined
}

/**
 * Every value path a node can bind to, in the order an editor should list them: the enclosing
 * `Repeat`'s item and position, then the sources the definition `uses` (every source when it doesn't
 * say), primary ones first.
 *
 * @param {Kit} kit
 * @param {WidgetDefinition} definition
 * @param {string} nodeId
 * @returns {ValueOption[]}
 */
export function bindableValues(kit, definition, nodeId) {
  const options = []

  // Only the innermost Repeat's item is reachable: `item` shadows outer ones.
  const repeat = repeatAncestors(definition.root, nodeId)?.at(-1)
  const itemFields = repeat?.bind?.items ? listItemFields(kit, repeat.bind.items) : undefined
  for (const [path, type] of Object.entries(itemFields ?? {})) {
    options.push({
      path: path ? `item.${path}` : 'item',
      type,
      source: 'item',
      sourceLabel: 'Item',
      label: path || 'item',
      description: 'The current item of the enclosing Repeat',
    })
  }
  if (repeat) {
    for (const [name, { type, description }] of Object.entries(positionFields)) {
      options.push({ path: `repeat.${name}`, type, source: 'repeat', sourceLabel: 'Position', label: name, description })
    }
  }

  const ids = Object.keys(kit.sources).filter((id) => !definition.uses || definition.uses.includes(id))
  ids.sort((a, b) => Number(!!kit.sources[b].primary) - Number(!!kit.sources[a].primary))

  for (const id of ids) {
    const source = kit.sources[id]
    for (const [name, spec] of Object.entries(source.fields)) {
      options.push({ path: `${id}.${name}`, type: spec.type, source: id, sourceLabel: source.label, label: name, description: spec.description })
    }
  }
  return options
}

/** The item fields of a `list` field, or undefined when the path isn't a list. */
export function listItemFields(kit, path) {
  const { source, keys } = parsePath(path)
  if (keys.length !== 1) return undefined
  const spec = kit.sources[source]?.fields[keys[0]]
  return spec?.type === 'list' ? (spec.item ?? { '': 'object' }) : undefined
}

export function pathType(kit, definition, nodeId, path) {
  const bare = path.startsWith('!') ? path.slice(1) : path
  return bindableValues(kit, definition, nodeId).find((option) => option.path === bare)?.type
}

/** Every source a definition binds to, across its base and variants: what a host must provide. */
export function sourcesUsed(definition) {
  const used = new Set()
  const add = (path) => {
    if (!path) return
    const { source } = parsePath(path)
    if (source !== 'item' && source !== 'repeat') used.add(source)
  }
  const addAction = (binding) => {
    if (!binding) return
    if (typeof binding === 'string') return add(binding)
    const { action, arg } = binding
    add(action)
    add(arg)
  }
  const visit = (node) => {
    Object.values(node.bind ?? {}).forEach(add)
    Object.values(node.on ?? {}).forEach(addAction)
    add(node.if)
    node.children?.forEach(visit)
  }
  visit(definition.root)
  for (const variant of definition.variants ?? []) {
    add(variant.when?.if)
    for (const override of Object.values(variant.overrides ?? {})) {
      Object.values(override.bind ?? {}).forEach(add)
      Object.values(override.on ?? {}).forEach(addAction)
      add(override.if)
    }
  }
  return [...used].sort()
}
