# `canvas/`: the widget on screen

The dotted canvas where the widget renders, what's selected on it, dragging elements around, and the editor that opens beside the selection.

| File                 | What it does                                                                                                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StudioCanvas.vue`   | The canvas: renders the widget with loom's `<Widget>` at the chosen width (with the library as edited, for Widget blocks to pick from), or once per frame side by side (see `preview/frames.js`), labels what's being previewed, outlines the selection, and shows where a drag would land. |
| `ElementPopover.vue` | The editor beside whatever was clicked: a breadcrumb up through its containers, a note when it isn't on screen, the add, move, nest, duplicate and delete buttons, and the Inspector.                                                                                                       |
| `useSelection.js`    | What's selected, its place in the tree, and the element its popover anchors to. A node that isn't rendered anchors to its nearest rendered ancestor, with the reason.                                                                                                                       |
| `useCanvasDrag.js`   | Drag and drop on the rendered widget: a press past a few pixels becomes a drag, and where the pointer sits in an element decides before, after or inside.                                                                                                                                   |

## Technically

- Loom renders every node with a `data-node-id` attribute, and this folder finds things on screen only through it. The studio adds no markup inside the widget.
- A click on the canvas is caught before the widget sees it (`onStageClick` in `studio.js`), so in edit mode clicks select instead of running actions. In Try mode they reach the widget.
- With several frames, the one being edited carries `data-focused-frame`. `stage` in `studio.js` looks it up whenever it's read, so selection, drag and the tour work in that frame without knowing there are others. The selection outline matches every frame, since they share node ids.
- The selection outline is a generated `<style>` (`selectionCss`), so it follows the element through re-renders without touching loom's DOM.
