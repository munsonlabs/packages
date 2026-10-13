# `definitions/`: working with a widget's JSON

Everything that reads, checks or changes a definition, apart from drawing it. `<Widget>` uses these to render; editors use them to show what's possible and what's wrong.

| File          | What it does                                                                                                                                                                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `paths.js`    | Bindings: splits `"story.title"` into source and keys and reads it (unwrapping Vue refs), lists what a node may bind to (`bindableValues`, including `item` and `repeat` inside a Repeat), and what type a binding has.                                                                                                                    |
| `variants.js` | Variants: `ruleMatches` and `matchVariant` pick one from data, width and scheme; `variantTree` and `applyVariant` apply its overrides (hidden, order, props, bindings) on top of the base; `diffAsOverride` turns an edit into the smallest override.                                                                                      |
| `validate.js` | `validateDefinition(kit, definition)`: every problem in the base and in every variant, such as an unknown block, a binding the kit can't provide, a type that doesn't fit, or a colour that won't follow dark mode (a warning).                                                                                                            |
| `match.js`    | Which widget renders some data: `conditionHolds` runs one condition on the raw data, `definitionMatches` all of a definition's `match`, `matchDefinition` picks the first of several that matches, `validateMatch` checks the conditions, and `shadowedWidgets` lists widgets never picked because an earlier one takes all the same data. |
| `library.js`  | `createLibrary` puts a kit's widgets in one file with what they need; `loadLibrary` reads one back, validates each widget against this kit, and skips (and reports) what can't render with it.                                                                                                                                             |

## Technically

- Variants never change the base: `variantTree` copies every node it touches. Structure (adding, removing, moving between parents) belongs to the base; a variant can only hide, reorder siblings, and change props, bindings, conditions and styles.
- The first variant whose rule matches wins. A rule with no conditions never matches on its own, so it's only used when pinned (the studio's variant menu, or `<Widget variant>`).
- A widget's `uses` is its scope: `bindableValues` lists only those sources (all of them when it's unset), so binding to another fails validation like a source the kit doesn't have.
- Validation is the only gate between a definition and the screen. `loadLibrary` uses it, so an app never renders a widget that would fail.
