import { effectScope, inject, onScopeDispose, provide } from 'vue'
import { parsePath, readPath } from './definitions/paths'
import { parseAction } from './definitions/validate'

/**
 * What every node of one `<Widget>` shares: its sources, how a value path becomes a value, and how a tap
 * becomes an action. `<Widget>` creates it and provides it; each `<WidgetNode>` injects it.
 *
 * @param {object} options
 * @param {() => import('./types').Kit} options.kit
 * @param {Readonly<import('vue').Ref>} options.data The widget's data.
 * @param {Readonly<import('vue').Ref<number>>} options.index
 * @param {() => unknown} options.context
 */
export function createRenderer({ kit, data, index, context }) {
  // Sources are set up lazily, the first time a binding reaches them, inside an effect scope tied
  // to the widget, so a definition edited live can reach new sources without remounting.
  const scope = effectScope()
  const sources = new Map()
  onScopeDispose(() => scope.stop())

  function source(id) {
    if (!sources.has(id)) {
      const spec = kit().sources[id]
      if (!spec) return undefined
      sources.set(
        id,
        scope.run(() => spec.setup({ data, index, context: context() })),
      )
    }
    return sources.get(id)
  }

  /** A value path's value: `item`/`repeat` from `locals` inside a `Repeat`, anything else from its source. */
  function readValue(path, locals) {
    const { negate, source: id, keys } = parsePath(path)
    const value = id in locals ? readPath(locals[id], keys) : readPath(source(id), keys)
    return negate ? !value : value
  }

  /** The DOM handler for a node's `on.click`, or `undefined` when it has none. Taps are the only event. */
  function clickHandler(node, locals) {
    const binding = node.on?.click
    if (!binding) return undefined
    const { action, arg } = parseAction(binding)
    return (e) => {
      // A handled click belongs to this node, not to a clickable ancestor (the Save button inside a tappable card).
      e.stopPropagation()
      const fn = readValue(action, locals)
      const value = arg ? readValue(arg, locals) : undefined
      // No argument means none at all: passing the event would land in parameters like `openArticle(story?)`.
      const run = () => (typeof fn === 'function' ? (arg ? fn(value) : fn()) : undefined)

      // The kit sees every action first, and may stop it (a paywall, say) or hold it until it answers.
      const guard = kit().guard
      const verdict = guard?.({
        action,
        arg: value,
        node: node.id,
        data: data.value,
        index: index.value,
        context: context(),
      })
      const isLink = node.type === 'Link'
      // A link with somewhere to go still goes there, alongside its action, unless the guard stops it or has to think.
      if (isLink && (verdict === false || verdict instanceof Promise || !e.currentTarget.getAttribute('href'))) e.preventDefault()
      if (verdict instanceof Promise) void verdict.then((ok) => ok !== false && run())
      else if (verdict !== false) run()
    }
  }

  return { kit, readValue, clickHandler }
}

const RENDERER = Symbol('loom-renderer')

export const provideRenderer = (renderer) => provide(RENDERER, renderer)

/** The renderer of the `<Widget>` this node is inside. */
export const useRenderer = () => inject(RENDERER)
