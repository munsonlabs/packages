/** What every Inspector tab gets. */
export const tabProps = {
  kit: { type: Object, required: true },
  /** The definition as the active variant renders it, so bindable paths match what's on screen. */
  definition: { type: Object, required: true },
  /** The node with the active variant's overrides applied. */
  node: { type: Object, required: true },
  /** Set while editing a variant: its label and its override for this node. */
  variant: Object,
}

/** What every Inspector tab emits: a change to the node, or resetting one overridden field. */
export const tabEmits = ['edit', 'reset']

/** Which of a node's fields the variant being edited overrides, for the OverrideMarks and tab dots. */
export function overridesIn(override) {
  return {
    prop: (name) => override?.props?.[name] !== undefined || override?.bind?.[name] !== undefined,
    click: override?.on?.click !== undefined,
    if: override?.if !== undefined,
    style: !!override?.style,
  }
}
