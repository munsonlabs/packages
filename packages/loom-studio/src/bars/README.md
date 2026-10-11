# `bars/`: the floating toolbars

The controls around the canvas. Each reads the studio object and calls its actions.

| File                | Where       | What it does                                                                                                              |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| `IdentityBar.vue`   | Top left    | The widget's name and kind, then the host app's own controls (`<LoomStudio>`'s `actions` slot).                           |
| `DocumentBar.vue`   | Top right   | The studio's own light/dark, the tour, undo and redo, **Layers**, theme, ⌘K, issues, export, and **Publish**.             |
| `ThemePopover.vue`  | Top right   | The theme button and panel: the widget's token overrides, and "fixed colours".                                            |
| `IssuesPopover.vue` | Top right   | A tick when the widget is valid, else its problems from loom's validator, each one click from the element.                |
| `PreviewBar.vue`    | Bottom      | The variant being edited (and the variants panel), sample data, theme, light/dark, width, **Frames**, **Rules**, **Try**. |
| `StatusHints.vue`   | Top centre  | What clicking does now, and a banner while a variant is being edited.                                                     |
| `CallsLog.vue`      | Bottom left | Every call the previewed widget made to the app.                                                                          |

## Technically

- Each control that the tour explains carries a `data-tour="…"` marker, which `tour/steps.js` points at. Moving or renaming one means updating its step.
- The shared look of the bars is the `.loom-bar` class in `LoomStudio.vue`.
