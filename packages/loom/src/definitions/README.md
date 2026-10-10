# `definitions/`: working with a widget's JSON

Everything that reads, checks or changes a definition, apart from drawing it. `<Widget>` uses these to render; editors use them to show what's possible and what's wrong.

| File          | What it does                                                                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paths.js`    | Bindings: splits `"product.title"` into source and keys and reads it (unwrapping Vue refs), lists what a node may bind to (`bindableValues`, including `item` and `repeat` inside a Repeat, kind-suggested sources first), and what type a binding has. |
| `variants.js` | Variants: `ruleMatches` and `matchVariant` pick one from data and width; `variantTree` and `applyVariant` apply its overrides (hidden, order, props, bindings) on top of the base.                                                                      |
| `validate.js` | `validateDefinition(kit, definition)`: every problem in the base and in every variant, such as an unknown block or kind, a binding the kit can't provide, or a type that doesn't fit.                                                                   |

## Technically

- Variants never change the base: `variantTree` copies every node it touches. Structure (adding, removing, moving between parents) belongs to the base; a variant can only hide, reorder siblings, and change props, bindings, conditions and styles.
- The first variant whose rule matches wins. A rule with no conditions never matches on its own, so it's only used when pinned (`<Widget variant>`).
- Validation is the only gate between a definition and the screen: an app should never render a widget that would fail.
