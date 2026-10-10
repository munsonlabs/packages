# `editing/`: changing the definition

Everything that changes the widget's JSON, and nothing that draws it. It's plain logic, tested without mounting the editor.

| File                | What it does                                                                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tree.js`           | Pure helpers over a definition's node tree: find a node, its parent or path, and add, move, nest, duplicate or remove one. `update(definition, fn)` applies `fn` to a copy. |
| `useHistory.js`     | Undo and redo. `change(fn)` changes a copy and keeps the previous definition; `checkpoint(next)` swaps in a whole new one.                                                  |
| `useTreeEditing.js` | The actions on the selected element: add, move, nest, duplicate, delete, and edit it.                                                                                       |

## Technically

- `clone` and `update` copy through JSON on purpose: `structuredClone` throws on Vue's reactive proxies, and definitions are JSON anyway.
- Tests: `test/editing/`.
