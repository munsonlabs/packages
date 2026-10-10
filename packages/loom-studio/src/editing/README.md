# `editing/`: changing the definition

Everything that changes the widget's JSON, and nothing that draws it. It's plain logic, tested without mounting the editor.

| File                   | What it does                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tree.js`              | Pure helpers over a definition's node tree: find a node, its parent or path, and add, move, nest, relocate, duplicate or remove one. `update(definition, fn)` applies `fn` to a copy. |
| `useHistory.js`        | Undo and redo. `change(fn)` changes a copy and keeps the previous definition; `checkpoint(next)` swaps in a whole new one (an import, say).                                           |
| `useVariantEditing.js` | Which variant is being edited, the tree as it arranges it (`tree`, with hidden nodes listed) and as it renders (`rendered`). Hiding a node and resetting one overridden field.        |
| `useTreeEditing.js`    | The actions on the selected element: add, move, nest, duplicate, delete, edit it, and where a drag may drop. Each one does the right thing on the base and in a variant.              |

## Technically

- `clone` and `update` copy through JSON on purpose: `structuredClone` throws on Vue's reactive proxies, and definitions are JSON anyway.
- In a variant, structure belongs to the base. `useTreeEditing` turns a move into the parent's `order`, delete into `hidden`, and an edit into the smallest override (`diffAsOverride` from loom). Adding and nesting aren't offered.
- Tests: `test/editing/`.
