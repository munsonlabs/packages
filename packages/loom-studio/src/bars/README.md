# `bars/`: the floating toolbars

The controls around the canvas. Each reads the studio object and calls its actions.

| File                | Where      | What it does                                                                                               |
| ------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| `IdentityBar.vue`   | Top left   | The widget's name and kind, then the host app's own controls (`<LoomStudio>`'s `actions` slot).            |
| `DocumentBar.vue`   | Top right  | Undo and redo, theme, issues, export, and **Publish**.                                                     |
| `ThemePopover.vue`  | Top right  | The theme button and panel: the widget's token overrides.                                                  |
| `IssuesPopover.vue` | Top right  | A tick when the widget is valid, else its problems from loom's validator, each one click from the element. |
| `PreviewBar.vue`    | Bottom     | Sample data, theme, width.                                                                                 |
| `StatusHints.vue`   | Top centre | What clicking does.                                                                                        |

## Technically

- The shared look of the bars is the `.loom-bar` class in `LoomStudio.vue`.
