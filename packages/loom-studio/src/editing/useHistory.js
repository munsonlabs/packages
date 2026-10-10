import { computed, shallowRef } from 'vue'
import { update } from './tree'

/**
 * Undo and redo over the definition being edited. Every change goes through `checkpoint` (a whole
 * new definition) or `change` (a change to a copy), which keeps the previous one to go back to.
 */
export function useHistory(definition, limit = 100) {
  const past = shallowRef([])
  const future = shallowRef([])

  function checkpoint(next) {
    past.value = [...past.value.slice(-(limit - 1)), definition.value]
    future.value = []
    definition.value = next
  }

  /** Applies `fn` to a copy of the definition, never the original, and checkpoints it. */
  function change(fn) {
    checkpoint(update(definition.value, fn))
  }

  function undo() {
    const previous = past.value.at(-1)
    if (!previous) return
    future.value = [definition.value, ...future.value]
    past.value = past.value.slice(0, -1)
    definition.value = previous
  }

  function redo() {
    const [next, ...rest] = future.value
    if (!next) return
    past.value = [...past.value, definition.value]
    future.value = rest
    definition.value = next
  }

  return {
    canUndo: computed(() => past.value.length > 0),
    canRedo: computed(() => future.value.length > 0),
    checkpoint,
    change,
    undo,
    redo,
  }
}
