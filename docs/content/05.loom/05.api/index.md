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
import {
  createKit,
  defineSource,
  defineKind,
  defineBlock,
  provideKit,
  getKind,
  matchKind,
  matchDefinition,
  validateDefinition,
  Widget,
} from '@munsonlabs/loom'
import '@munsonlabs/loom/style.css'
```

### Kits

| Export                                      | Does                                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| `createKit(options)`                        | A kit from `sources`, `blocks`, `kinds` and `describe`. Throws on clashing names. |
| `defineSource`, `defineKind`, `defineBlock` | Identity helpers: they return their argument.                                     |
| `provideKit(kit, context?)`                 | The default kit and context for every `<Widget>` below.                           |
| `getKind(kit, id)`, `matchKind(kit, data)`  | A kind by id; the first kind that matches data.                                   |
| `matchDefinition(kit, data, definitions)`   | The first definition whose kind matches the data.                                 |

### `<Widget>`

| Prop          | Type                 | Notes                                        |
| ------------- | -------------------- | -------------------------------------------- |
| `kit`         | `Kit`                | Or `provideKit()`.                           |
| `definition`  | `WidgetDefinition`   |                                              |
| `definitions` | `WidgetDefinition[]` | Used when `definition` isn't: picks by kind. |
| `data`        | any                  | Required.                                    |
| `index`       | `number`             | Passed to sources. Default `0`.              |
| `context`     | any                  | Or `provideKit()`.                           |

Slot `fallback({ data })` renders when no definition fits.

### Definitions

| Export                                | Does                                                         |
| ------------------------------------- | ------------------------------------------------------------ |
| `validateDefinition(kit, definition)` | Every problem in the tree. `[]` means it renders as written. |

## `@munsonlabs/loom/editor`

What an editor needs beyond rendering. An app that only renders widgets never imports them.

| Export                                                              | Does                                                                       |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `bindableValues(kit, definition, nodeId)`                           | What a node can bind to, in editor order.                                  |
| `parseAction(binding)`                                              | An action binding as `{ action, arg? }`, whichever form it was written in. |
| `blockDefaults(kit, type)`, `createDefinition(kit, kind, identity)` | A block's default props; a new widget from a kind's starter.               |

## Types

There are no types to import in JavaScript. Each shape is a JSDoc `@typedef` beside the code that uses it, under `packages/loom/src/`:

| File                      | Typedefs                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `types/definition.js`     | `WidgetDefinition`, `WidgetNode`, `ValuePath`, `ActionBinding`                                |
| `types/kit.js`            | `Kit`, `KitOptions`, `Source`, `SourceContext`, `FieldSpec`, `FieldType`, `ValueType`, `Kind` |
| `types/blocks.js`         | `BlockSpec`, `BlockPropSpec`, `BlockType`                                                     |
| `definitions/validate.js` | `ValidationIssue`                                                                             |
| `definitions/paths.js`    | `ValueOption`                                                                                 |
