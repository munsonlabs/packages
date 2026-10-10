# `dialogs/`: modals

| File                 | What it does                                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CommandPalette.vue` | ⌘K: jump to any element, add a block, switch variant, or open any panel.                                                                                                            |
| `ExportModal.vue`    | This widget's JSON, the whole library as one file (when the app passes `library`), and a usage snippet; copy or download each.                                                      |
| `ImportModal.vue`    | Paste JSON: a single widget replaces the one being edited (undoably); a library goes to the app through the `importLibrary` event, with what was skipped and why.                   |
| `conditions.js`      | A widget's conditions in words (`describeMatch`), for the identity bar and the library list.                                                                                        |
| `parseImport.js`     | Tells a pasted widget from a pasted library. A widget keeps the id of the one being edited, so the app's library still finds it.                                                    |
| `NewWidgetModal.vue` | Starts a widget: a name, and blank or a copy of one in the library. One of the package's two exports: apps open it themselves, since adding a widget to their library is their job. |

## Technically

- The palette runs an action only after it has closed, and stops the modal handing focus back to the page (`onCloseAutoFocus`). Otherwise the element editor would read the focus change as "clicked away" and close.
- The studio never adds an imported library to anything itself. The app decides, which is why it's an event.
