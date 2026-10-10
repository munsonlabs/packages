# `dialogs/`: modals

| File                 | What it does                                                                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CommandPalette.vue` | ⌘K: jump to any element, add a block, switch variant, or open any panel.                                                                                          |
| `ExportModal.vue`    | This widget's JSON, the whole library as one file (when the app passes `library`), and a usage snippet; copy or download each.                                    |
| `ImportModal.vue`    | Paste JSON: a single widget replaces the one being edited (undoably); a library goes to the app through the `importLibrary` event, with what was skipped and why. |
| `NewWidgetModal.vue` | Starts a widget from one of the kit's kinds. One of the package's two exports: apps open it themselves, since adding a widget to their library is their job.      |

## Technically

- The palette runs an action only after it has closed, and stops the modal handing focus back to the page (`onCloseAutoFocus`). Otherwise the element editor would read the focus change as "clicked away" and close.
- The studio never adds an imported library to anything itself. The app decides, which is why it's an event.
