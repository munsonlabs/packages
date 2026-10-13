# `dialogs/`: modals

| File                 | What it does                                                                                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CommandPalette.vue` | ⌘K: jump to any element, add a block, switch variant, or open any panel.                                                                                                                                   |
| `ExportModal.vue`    | This widget's JSON, the whole library as one file (when the app passes `library`), and a usage snippet; copy or download each.                                                                             |
| `ImportModal.vue`    | Paste JSON: a single widget replaces the one being edited (undoably); a library goes to the app through the `importLibrary` event, with what was skipped and why.                                          |
| `parseImport.js`     | Tells a pasted widget from a pasted library. A widget keeps the id of the one being edited, so the app's library still finds it.                                                                           |
| `MatchFields.vue`    | The form for when a widget renders and what it uses: conditions on the data (with a live count of the samples they take) and the sources it can bind to. Shared by the two dialogs below.                  |
| `MatchModal.vue`     | The open widget's conditions and sources, from the identity bar. Saving is one undoable change.                                                                                                            |
| `conditions.js`      | Conditions as form rows and back, paths to suggest from the samples, and a one-line summary (`describeMatch`).                                                                                             |
| `NewWidgetModal.vue` | Starts a widget: a name, blank or a copy of one in the library, and its conditions and sources. The package's second export: apps open it themselves, since adding a widget to their library is their job. |

## Technically

- The palette runs an action only after it has closed, and stops the modal handing focus back to the page (`onCloseAutoFocus`). Otherwise the element editor would read the focus change as "clicked away" and close.
- Reka's select can't take an empty value, so the new-widget dialog's "blank" is a sentinel, `BLANK`.
- The studio never adds an imported library to anything itself. The app decides, which is why it's an event.
