# `panels/`: the forms inside popovers

The editing forms. Unlike the rest of the studio, these don't read the shared studio object: they take props and emit changes, so they can be reused in another editor.

| File                 | What it does                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `inspector/`         | The element editor: a tab bar with **Content**, **Actions**, **Show when** and **Style**, one component per tab. See its README.              |
| `StyleEditor.vue`    | An element's CSS, property by property, offering the token scales (spacing, radius, colour…) where they fit.                                  |
| `TokensEditor.vue`   | The theme panel: every design token, grouped, with what the theme gives and what this widget or variant overrides, each with a reset.         |
| `TokenInput.vue`     | One value field: pick a step from a token scale or type your own.                                                                             |
| `KeyValueEditor.vue` | A small list of name and value rows, for extra CSS variables in the theme panel.                                                              |
| `VariantsPanel.vue`  | The widget's variants: add, delete and reorder them by priority, and edit the rules that pick each one (data, width) and its token overrides. |
| `OverrideMark.vue`   | The marker beside a field a variant changes, which resets it to the base.                                                                     |
| `options.js`         | Builds the lists these use: what a field can bind to, grouped by source (`valueOptions`), block icons, colours per value type.                |

## Technically

- What a field can bind to comes from loom's `bindableValues`, filtered by type, so a number field only offers numbers, and inside a Repeat `item.*` is offered too.
- When a variant is being edited, the Inspector receives that variant's override for the node and shows an `OverrideMark` on each overridden field. Resetting emits `reset`, which `ElementPopover` passes to `resetField`.
