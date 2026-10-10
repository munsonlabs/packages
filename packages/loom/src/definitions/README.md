# `definitions/`: working with a widget's JSON

Everything that reads or checks a definition, apart from drawing it. `<Widget>` uses these to render; editors use them to show what's possible and what's wrong.

| File          | What it does                                                                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paths.js`    | Bindings: splits `"product.title"` into source and keys and reads it (unwrapping Vue refs), lists what a node may bind to (`bindableValues`, including `item` and `repeat` inside a Repeat), and what type a binding has. |
| `validate.js` | `validateDefinition(kit, definition)`: every problem in the tree, such as an unknown block, a binding the kit can't provide, or a type that doesn't fit.                                                                  |

## Technically

- Validation is the only gate between a definition and the screen: an app should never render a widget that would fail.
