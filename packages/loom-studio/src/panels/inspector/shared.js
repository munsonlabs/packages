/** What every Inspector tab gets. */
export const tabProps = {
  kit: { type: Object, required: true },
  /** The definition being edited, so bindable paths match what's on screen. */
  definition: { type: Object, required: true },
  node: { type: Object, required: true },
}

/** What every Inspector tab emits: a change to the node. */
export const tabEmits = ['edit']
