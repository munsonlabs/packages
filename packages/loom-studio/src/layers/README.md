# `layers/`: the layers panel

The widget's tree beside the canvas, opened from **Layers** in the top bar or with **L**. It's for what's awkward on the canvas: picking a container its children fill, reaching elements that aren't on screen, and moving things precisely.

| File              | What it does                                                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LayersPanel.vue` | The panel: one row per element (icon, label, what it shows), collapsible, sharing the selection with the canvas. Rows drag to move, and have hover actions: hide or show in a variant; duplicate or delete on the base. |
| `layers.js`       | Pure helpers: `layerRows` turns the tree into rows (marking what a variant hides), and `dropPosition` says whether a drop lands before, after or inside a row.                                                          |

## Technically

- It reads the tree as the edited variant arranges it (`s.variants.tree`), so in a variant the rows follow that variant's order and show what it hides.
- Moves go through the same rules as dragging on the canvas (`s.editing.canDrop` and `s.editing.drop`): anything anywhere on the base, only among siblings in a variant (saved as `order`).
- "Not on screen" is measured from the canvas after each render (an element with that `data-node-id` exists or doesn't), so it reflects the current sample and width.
- Clicking a row calls `s.selection.select`, which opens the usual editor beside the element, or beside its nearest visible ancestor.
- Tests: `test/layers/layers.spec.js`.
