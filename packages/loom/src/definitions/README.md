# `definitions/`: working with a widget's JSON

Everything that reads, checks or changes a definition, apart from drawing it. `<Widget>` uses these to render; editors use them to show what's possible and what's wrong.

| File          | What it does                                                                                                                                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paths.js`    | Bindings: splits `"story.title"` into source and keys and reads it (unwrapping Vue refs), lists what a node may bind to (`bindableValues`, including `item` and `repeat` inside a Repeat), and what type a binding has.                               |
| `variants.js` | Variants: `ruleMatches` and `matchVariant` pick one from data, width and scheme; `variantTree` and `applyVariant` apply its overrides (hidden, order, props, bindings) on top of the base; `diffAsOverride` turns an edit into the smallest override. |
| `validate.js` | `validateDefinition(kit, definition)`: every problem in the base and in every variant, such as an unknown block, a binding the kit can't provide, a type that doesn't fit, or a colour that won't follow dark mode (a warning).                       |
| `kinds.js`    | Kinds as JSON: `validateKind(kit, spec)` checks one against a kit; `withKinds(kit, specs)` adds them, in order, throwing on one with errors.                                                                                                          |
| `library.js`  | `createLibrary` puts a kit's widgets in one file with what they need; `loadLibrary` reads one back, adds its kinds that fit, validates each widget against the result, and skips (and reports) what can't render with this kit.                       |

## Technically

- Variants never change the base: `variantTree` copies every node it touches. Structure (adding, removing, moving between parents) belongs to the base; a variant can only hide, reorder siblings, and change props, bindings, conditions and styles.
- The first variant whose rule matches wins. A rule with no conditions never matches on its own, so it's only used when pinned (the studio's variant menu, or `<Widget variant>`).
- Validation is the only gate between a definition and the screen. `loadLibrary` uses it, so an app never renders a widget that would fail.
