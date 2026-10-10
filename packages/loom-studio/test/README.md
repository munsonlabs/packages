# `test/`: Loom Studio's tests

Vitest with happy-dom (`vp test`). Folders mirror `src/`. They test the logic without mounting the editor, using the small kit in `fixtures.js`; the UI itself is checked by hand in `apps/demos/loom-studio`.

| Path                                | Covers                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `fixtures.js`                       | A tiny kit (one source, a theme with a dark partner), a card for notes with a variant, `inScope()`. |
| `editing/tree.spec.js`              | Moving nodes, and where they're allowed to go.                                                      |
| `editing/useHistory.spec.js`        | Edits on a copy, undo, redo, the history limit.                                                     |
| `editing/useVariantEditing.spec.js` | Hiding in a variant, resetting one field, falling back to the base.                                 |
| `editing/useTreeEditing.spec.js`    | Add, move, duplicate, delete and edit, on the base and in a variant.                                |
| `dialogs/parseImport.spec.js`       | A pasted widget keeps the edited widget's id; a library passes through; anything else is refused.   |
| `layers/layers.spec.js`             | Rows from the tree (labels, hints, collapsing, what a variant hides), and drop positions.           |
| `preview/usePreview.spec.js`        | Which samples are offered, and themes with dark partners.                                           |
