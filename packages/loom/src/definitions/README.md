# `definitions/`: working with a widget's JSON

Everything that reads, checks or changes a definition, apart from drawing it. `<Widget>` uses these to render; editors use them to show what's possible and what's wrong.

| File          | What it does                                                                                                                                                                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paths.js`    | Bindings: splits `"product.title"` into source and keys and reads it (unwrapping Vue refs), lists what a node may bind to (`bindableValues`, including `item` and `repeat` inside a Repeat, and only the sources the definition `uses`), and what type a binding has.              |
| `variants.js` | Variants: `ruleMatches` and `matchVariant` pick one from data, width and scheme; `variantTree` and `applyVariant` apply its overrides (hidden, order, props, bindings) on top of the base.                                                                                         |
| `validate.js` | `validateDefinition(kit, definition)`: every problem in the base and in every variant, such as an unknown block, a malformed condition, a binding the kit can't provide or the widget doesn't `use`, a type that doesn't fit, or a colour that won't follow dark mode (a warning). |
| `match.js`    | Which widget renders some data: `conditionHolds` runs one condition on the raw data, `definitionMatches` all of a definition's `match`, `matchDefinition` picks the first of several that matches, and `validateMatch` checks the conditions.                                      |

## Technically

- Variants never change the base: `variantTree` copies every node it touches. Structure (adding, removing, moving between parents) belongs to the base; a variant can only hide, reorder siblings, and change props, bindings, conditions and styles.
- The first variant whose rule matches wins. A rule with no conditions never matches on its own, so it's only used when pinned (`<Widget variant>`).
- A widget's `uses` is its scope: `bindableValues` lists only those sources (all of them when it's unset), so binding to another fails validation like a source the kit doesn't have.
- Validation is the only gate between a definition and the screen: an app should never render a widget that would fail.
