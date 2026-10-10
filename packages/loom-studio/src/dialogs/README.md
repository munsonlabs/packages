# `dialogs/`: modals

| File                 | What it does                                                             |
| -------------------- | ------------------------------------------------------------------------ |
| `CommandPalette.vue` | ⌘K: jump to any element, add a block, switch variant, or open any panel. |
| `ExportModal.vue`    | This widget's JSON and a usage snippet; copy or download the JSON.       |
| `ImportModal.vue`    | Paste JSON: a single widget replaces the one being edited (undoably).    |

## Technically

- The palette runs an action only after it has closed, and stops the modal handing focus back to the page (`onCloseAutoFocus`). Otherwise the element editor would read the focus change as "clicked away" and close.
