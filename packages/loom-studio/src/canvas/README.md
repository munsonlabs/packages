# `canvas/`: the widget on screen

The dotted canvas where the widget renders, what's selected on it, and the editor that opens beside the selection.

| File                 | What it does                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StudioCanvas.vue`   | The canvas: renders the widget with loom's `<Widget>` at the chosen width, labels what's being previewed, and outlines the selection.                                                 |
| `ElementPopover.vue` | The editor beside whatever was clicked: a breadcrumb up through its containers, a note when it isn't on screen, the add, move, nest, duplicate and delete buttons, and the Inspector. |
| `useSelection.js`    | What's selected, its place in the tree, and the element its popover anchors to. A node that isn't rendered anchors to its nearest rendered ancestor, with the reason.                 |

## Technically

- Loom renders every node with a `data-node-id` attribute, and this folder finds things on screen only through it. The studio adds no markup inside the widget.
- A click on the canvas is caught before the widget sees it (`onStageClick` in `studio.js`), so in edit mode clicks select instead of running actions. In Try mode they reach the widget.
- The selection outline is a generated `<style>` (`selectionCss`), so it follows the element through re-renders without touching loom's DOM.
