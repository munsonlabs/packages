# `panels/`: the forms inside popovers

The editing forms. Unlike the rest of the studio, these don't read the shared studio object: they take props and emit changes, so they can be reused in another editor.

| File         | What it does                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `inspector/` | The element editor: a tab bar with **Content**, **Actions** and **Show when**, one component per tab. See its README.          |
| `options.js` | Builds the lists these use: what a field can bind to, grouped by source (`valueOptions`), block icons, colours per value type. |

## Technically

- What a field can bind to comes from loom's `bindableValues`, filtered by type, so a number field only offers numbers, and inside a Repeat `item.*` is offered too.
