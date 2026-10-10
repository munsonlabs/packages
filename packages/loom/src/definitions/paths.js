import { unref } from 'vue'

/**
 * Value paths, shared by the renderer (values) and, later, editors (types).
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
