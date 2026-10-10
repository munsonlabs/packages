export const BASE_VARIANT = 'base'

/** Size buckets, widest first. */
const BREAKPOINTS = [
  ['lg', 500],
  ['md', 300],
  ['sm', 0],
]

/**
 * @param {number} width
 * @returns {WidgetSize}
 */
export function widthToSize(width) {
  return BREAKPOINTS.find(([, min]) => width >= min)[0]
}

/**
 * @param {WidgetDefinition} definition
 * @param {string | undefined} id
 * @returns {WidgetVariant | undefined}
 */
export function findVariant(definition, id) {
  return id && id !== BASE_VARIANT ? definition.variants?.find((v) => v.id === id) : undefined
}

/** Merges a record where `null` deletes the base's key. */
function mergeNullable(base, over) {
  if (!over) return base
  const merged = { ...base }
  for (const [key, value] of Object.entries(over)) {
    if (value === null) delete merged[key]
    else merged[key] = value
  }
  return Object.keys(merged).length ? merged : undefined
}

/** Children with the ids an `order` lists first, in its order, then the rest as they were. */
export function sortChildren(children, order) {
  if (!order?.length) return children
  const rank = new Map(order.map((id, i) => [id, i]))
  return [...children].sort((a, b) => (rank.get(a.id) ?? order.length) - (rank.get(b.id) ?? order.length))
}

/** Always a copy: `variantTree` replaces `children` on the result, which must never reach the base. */
function applyOverride(node, override) {
  const next = { ...node }
  if (!override) return next
  if (override.props) next.props = { ...node.props, ...override.props }
  if (override.bind) next.bind = mergeNullable(node.bind, override.bind)
  if (override.on) next.on = mergeNullable(node.on, override.on)
  if (override.style) next.style = mergeNullable(node.style, override.style)
  if (override.if === null) delete next.if
  else if (override.if) next.if = override.if
  for (const key of ['bind', 'on', 'style']) if (!next[key]) delete next[key]
  return next
}

/**
 * The tree a variant renders. With `keepHidden`, hidden nodes stay in (for the editor's layers,
 * which show them dimmed) and are listed in the returned set.
 *
 * @param {WidgetDefinition} definition
 * @param {string} [variantId]
 * @param {boolean} [keepHidden=false]
 * @returns {{ root: WidgetNode; hidden: Set<string> }}
 */
export function variantTree(definition, variantId, keepHidden = false) {
  const overrides = findVariant(definition, variantId)?.overrides ?? {}
  const hidden = new Set()

  const visit = (node) => {
    const override = overrides[node.id]
    // The root can't be hidden: a widget that should show nothing is the host's decision.
    if (override?.hidden && node.id !== definition.root.id) {
      hidden.add(node.id)
      if (!keepHidden) return null
    }
    const next = applyOverride(node, override)
    if (node.children) {
      next.children = sortChildren(node.children, override?.order)
        .map(visit)
        .filter((c) => !!c)
    }
    return next
  }

  return { root: visit(definition.root), hidden }
}

/**
 * A definition with one variant applied and no variants left: what renders, and what validates.
 *
 * @param {WidgetDefinition} definition
 * @param {string} [variantId]
 * @returns {WidgetDefinition}
 */
export function applyVariant(definition, variantId) {
  const variant = findVariant(definition, variantId)
  if (!variant) return definition
  const { variants: _, ...rest } = definition
  return { ...rest, vars: { ...definition.vars, ...variant.vars }, root: variantTree(definition, variantId).root }
}

/**
 * @typedef {object} MatchContext
 * @property {number} [width]
 * @property {ColorScheme} [scheme] The colour scheme the widget renders in.
 * @property {(path: string) => unknown} readValue Reads a value path in the widget's root scope.
 */

/**
 * @param {VariantRule | undefined} rule
 * @param {MatchContext} ctx
 * @returns {boolean}
 */
export function ruleMatches(rule, ctx) {
  if (!rule) return false
  const checks = []
  if (rule.if) checks.push(!!ctx.readValue(rule.if))
  if (rule.size?.length) checks.push(ctx.width != null && rule.size.includes(widthToSize(ctx.width)))
  if (rule.minWidth != null) checks.push(ctx.width != null && ctx.width >= rule.minWidth)
  if (rule.maxWidth != null) checks.push(ctx.width != null && ctx.width <= rule.maxWidth)
  if (rule.scheme) checks.push(ctx.scheme === rule.scheme)
  return checks.length > 0 && checks.every(Boolean)
}

/**
 * The first variant whose rule matches, or undefined for the base.
 *
 * @param {WidgetDefinition} definition
 * @param {MatchContext} ctx
 * @returns {string | undefined}
 */
export function matchVariant(definition, ctx) {
  return definition.variants?.find((v) => ruleMatches(v.when, ctx))?.id
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** Keys of `edited` that differ from `base`, with `null` for keys `edited` dropped. */
function diffRecord(base, edited) {
  const diff = {}
  for (const key of new Set([...Object.keys(base ?? {}), ...Object.keys(edited ?? {})])) {
    const a = base?.[key]
    const b = edited?.[key]
    if (same(a, b)) continue
    diff[key] = b === undefined ? null : b
  }
  return Object.keys(diff).length ? diff : undefined
}

/**
 * The override that turns `base` into `edited`, keeping `hidden` and `order` from `previous`.
 * Editors apply a change to the resolved node and store the diff, so an override never holds
 * anything the base already says.
 *
 * @param {WidgetNode} base
 * @param {WidgetNode} edited
 * @param {NodeOverride} [previous]
 * @returns {NodeOverride | undefined}
 */
export function diffAsOverride(base, edited, previous) {
  const override = {}
  const props = diffRecord(base.props, edited.props)
  if (props) override.props = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== null))
  if (override.props && !Object.keys(override.props).length) delete override.props
  const bind = diffRecord(base.bind, edited.bind)
  if (bind) override.bind = bind
  const on = diffRecord(base.on, edited.on)
  if (on) override.on = on
  const style = diffRecord(base.style, edited.style)
  if (style) override.style = style
  if (base.if !== edited.if) override.if = edited.if ?? null
  if (previous?.hidden) override.hidden = true
  if (previous?.order?.length) override.order = previous.order
  return Object.keys(override).length ? override : undefined
}
