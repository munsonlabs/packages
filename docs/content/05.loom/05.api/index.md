---
title: Reference
description: Every export.
navigation:
  icon: i-lucide:list
---

Loom has two entry points. An app needs only the first; editors use the second as well.

## `@munsonlabs/loom`

What an app needs: make a kit, validate definitions, render widgets.

```js
import { createKit, provideKit, matchDefinition, validateDefinition, Widget } from '@munsonlabs/loom'
import '@munsonlabs/loom/style.css'
```

### Kits

| Export                               | Does                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| `createKit(options)`                 | A kit from `sources`, `blocks`, `describe`. Throws on clashing names.                 |
| `provideKit(kit, context?)`          | The default kit and context for every `<Widget>` below.                               |
| `matchDefinition(data, definitions)` | The first definition whose [conditions](/loom/core-concepts/matching) the data meets. |

### `<Widget>`

| Prop          | Type                 | Notes                                                 |
| ------------- | -------------------- | ----------------------------------------------------- |
| `kit`         | `Kit`                | Or `provideKit()`.                                    |
| `definition`  | `WidgetDefinition`   |                                                       |
| `definitions` | `WidgetDefinition[]` | Used when `definition` isn't: the first that matches. |
| `data`        | any                  | Required.                                             |
| `index`       | `number`             | Passed to sources. Default `0`.                       |
| `context`     | any                  | Or `provideKit()`.                                    |
| `variant`     | `string`             | Pins a variant, or `'base'`.                          |

Emits `variant(id)`. Slot `fallback({ data })` renders when no definition fits.

### Definitions

| Export                                | Does                                                                |
| ------------------------------------- | ------------------------------------------------------------------- |
| `validateDefinition(kit, definition)` | Every problem, base and variants. `[]` means it renders as written. |

## `@munsonlabs/loom/editor`

What an editor needs beyond rendering. An app that only renders widgets never imports them.

| Export                                                                                    | Does                                                                                                   |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `bindableValues(kit, definition, nodeId)`                                                 | What a node can bind to, in editor order.                                                              |
| `parseAction(binding)`                                                                    | An action binding as `{ action, arg? }`, whichever form it was written in.                             |
| `BASE_VARIANT`, `findVariant`                                                             | The base's id (`'base'`), and a variant by id.                                                         |
| `applyVariant(definition, id)`, `variantTree(definition, id, keepHidden)`                 | The plain definition a variant renders; its tree, optionally with hidden nodes kept and listed.        |
| `widthToSize(width)`                                                                      | The size bucket (`sm`, `md`, `lg`) for a width.                                                        |
| `blockDefaults(kit, type)`                                                                | A block's default props.                                                                               |
| `CONDITION_OPS`, `conditionHolds(condition, data)`, `definitionMatches(definition, data)` | The tests a condition can use; whether data meets one; whether it meets all of a definition's `match`. |

## Types

There are no types to import in JavaScript. Each shape is a JSDoc `@typedef` beside the code that uses it, under `packages/loom/src/`:

| File                      | Typedefs                                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `types/definition.js`     | `WidgetDefinition`, `Condition`, `WidgetNode`, `WidgetVariant`, `NodeOverride`, `VariantRule`, `WidgetSize`, `ValuePath`, `ActionBinding` |
| `types/kit.js`            | `Kit`, `KitOptions`, `Source`, `SourceContext`, `FieldSpec`, `FieldType`, `ValueType`                                                     |
| `types/blocks.js`         | `BlockSpec`, `BlockPropSpec`, `BlockType`                                                                                                 |
| `definitions/validate.js` | `ValidationIssue`                                                                                                                         |
| `definitions/paths.js`    | `ValueOption`                                                                                                                             |
