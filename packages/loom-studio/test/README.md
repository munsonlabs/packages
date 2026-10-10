# `test/`: Loom Studio's tests

Vitest with happy-dom (`vp test`). Folders mirror `src/`. They test the logic without mounting the editor, using the small kit in `fixtures.js`; the UI itself is checked by hand in `apps/demos/loom-studio`.

| Path                             | Covers                                              |
| -------------------------------- | --------------------------------------------------- |
| `fixtures.js`                    | A tiny kit (notes and photos), a card, `inScope()`. |
| `editing/useHistory.spec.js`     | Edits on a copy, undo, redo, the history limit.     |
| `editing/useTreeEditing.spec.js` | Add, move, duplicate, delete and edit.              |
| `preview/usePreview.spec.js`     | Which samples are offered.                          |
