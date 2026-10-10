import { effectScope, inject, onScopeDispose, provide } from 'vue'
import { parsePath, readPath } from './definitions/paths'

/**
 * What every node of one `<Widget>` shares: its sources, and how a value path becomes a value.
 * `<Widget>` creates it and provides it; each `<WidgetNode>` injects it.
 *
 * @param {object} options
 * @param {() => import('./types').Kit} options.kit
 * @param {import('./types').SourceContext} options.sourceContext What each source's `setup` gets.
 */
export function createRenderer({ kit, sourceContext }) {
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
        scope.run(() => spec.setup(sourceContext)),
      )
    }
    return sources.get(id)
  }

  /** A value path's value, read from its source. */
  function readValue(path) {
    const { source: id, keys } = parsePath(path)
    return readPath(source(id), keys)
  }

  return { kit, readValue }
}

const RENDERER = Symbol('loom-renderer')

export const provideRenderer = (renderer) => provide(RENDERER, renderer)

/** The renderer of the `<Widget>` this node is inside. */
export const useRenderer = () => inject(RENDERER)
