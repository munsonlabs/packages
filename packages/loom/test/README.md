# `test/`: loom's tests

Vitest with happy-dom (`vp test`). Folders mirror `src/`, and every test uses the small shop kit in `fixtures.js` rather than any app's code.

| Path                              | Covers                                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `fixtures.js`                     | A tiny shop kit (products, a cart, a product card with variants), imported as `@test/fixtures`.      |
| `widget.spec.js`                  | `<Widget>`: rendering through sources, actions, and kits.                                            |
| `blocks/blocks.spec.js`           | Each built-in block's HTML.                                                                          |
| `definitions/definitions.spec.js` | Validation, bindings and `uses`, matching, variants and migration.                                   |
| `definitions/library.spec.js`     | Making and loading libraries, including what gets skipped and why.                                   |
| `theme/tokens.spec.js`            | That every token is declared in `styles.css`, and that blocks read only real tokens.                 |
| `theme/scheme.spec.js`            | Light and dark: following the device, counterpart themes, scheme rules and warnings, `light-dark()`. |
