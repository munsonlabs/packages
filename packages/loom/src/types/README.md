# `types/`: the shapes of everything

JSDoc `@typedef`s only, with no runtime code (except the `DEFINITION_VERSION` constant). Every other folder imports from here, so this is the best place to start reading loom.

| File            | Describes                                                                                                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `definition.js` | A widget as JSON: `WidgetDefinition`, the `Condition`s that say which data it's for, its tree of `WidgetNode`s, `WidgetVariant`s with their `VariantRule` and per-node `NodeOverride`s, and value paths (`"story.title"`). |
| `blocks.js`     | Blocks: `BlockType` (a block's name), `BlockSpec` (what a block accepts) and `BlockPropSpec` (one prop: its type, default, what it can be bound to, its token scale), and whether it can be tapped.                        |
| `kit.js`        | What an app plugs in: `KitOptions` and `Kit`, a `Source` (one composable and its declared `fields`), `SourceContext`.                                                                                                      |
| `index.js`      | Re-exports `DEFINITION_VERSION`, the one runtime value here, so the rest of loom imports `from '../types'`.                                                                                                                |

## Technically

- A definition is versioned (`version: 2`). A change to these shapes that old JSON would misread needs a version bump; `validateDefinition` rejects any other version, so `loadLibrary` skips old widgets and says why.
- `Kit` and `Source` are generic over `TData` (what a widget renders, such as a story) and `TContext` (what sources use to reach the app, such as the Bolt bridge): the typedefs' `@template`s, so a kit's composables can be documented with what they get.
- These are also the shapes apps and editors work with. Typedefs are documentation: there is nothing to import.
