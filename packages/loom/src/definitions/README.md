# `definitions/`: working with a widget's JSON

Everything that reads or checks a definition, apart from drawing it. `<Widget>` uses these to render; editors use them to show what's possible and what's wrong.

| File          | What it does                                                                                                                                                                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paths.js`    | Bindings: splits `"product.title"` into source and keys and reads it (unwrapping Vue refs), lists what a node may bind to (`bindableValues`, including `item` and `repeat` inside a Repeat, and only the sources the definition `uses`), and what type a binding has. |
| `validate.js` | `validateDefinition(kit, definition)`: every problem in the tree, such as an unknown block, a malformed condition, a binding the kit can't provide or the widget doesn't `use`, or a type that doesn't fit.                                                           |
| `match.js`    | Which widget renders some data: `conditionHolds` runs one condition on the raw data, `definitionMatches` all of a definition's `match`, `matchDefinition` picks the first of several that matches, and `validateMatch` checks the conditions.                         |

## Technically

- A widget's `uses` is its scope: `bindableValues` lists only those sources (all of them when it's unset), so binding to another fails validation like a source the kit doesn't have.
- Validation is the only gate between a definition and the screen: an app should never render a widget that would fail.
