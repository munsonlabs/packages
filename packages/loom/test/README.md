# `test/`: loom's tests

Vitest with happy-dom (`vp test`). Folders mirror `src/`, and every test uses the small shop kit in `fixtures.js` rather than any app's code.

| Path                              | Covers                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `fixtures.js`                     | A tiny shop kit (products, a cart, a product card with variants), imported as `@test/fixtures`. |
| `widget.spec.js`                  | `<Widget>`: rendering through sources, actions, and kits.                                       |
| `blocks/blocks.spec.js`           | Each built-in block's HTML.                                                                     |
| `definitions/definitions.spec.js` | Validation, bindings, kinds and variants.                                                       |
