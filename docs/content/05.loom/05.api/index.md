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
import { createKit, defineSource, defineBlock, provideKit, validateDefinition, Widget } from '@munsonlabs/loom'
import '@munsonlabs/loom/style.css'
```

### Kits

| Export                        | Does                                                         |
| ----------------------------- | ------------------------------------------------------------ |
| `createKit(options)`          | A kit from `sources` and `blocks`. Throws on clashing names. |
| `defineSource`, `defineBlock` | Identity helpers: they return their argument.                |
| `provideKit(kit, context?)`   | The default kit and context for every `<Widget>` below.      |

### `<Widget>`

| Prop         | Type               | Notes                           |
| ------------ | ------------------ | ------------------------------- |
| `kit`        | `Kit`              | Or `provideKit()`.              |
| `definition` | `WidgetDefinition` | Required.                       |
| `data`       | any                | Required.                       |
| `index`      | `number`           | Passed to sources. Default `0`. |
| `context`    | any                | Or `provideKit()`.              |

### Definitions

| Export                                | Does                                                         |
| ------------------------------------- | ------------------------------------------------------------ |
| `validateDefinition(kit, definition)` | Every problem in the tree. `[]` means it renders as written. |

## `@munsonlabs/loom/editor`

What an editor needs beyond rendering. An app that only renders widgets never imports them.

| Export                                    | Does                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `bindableValues(kit, definition, nodeId)` | What a node can bind to, in editor order.                                  |
| `parseAction(binding)`                    | An action binding as `{ action, arg? }`, whichever form it was written in. |
| `blockDefaults(kit, type)`                | A block's default props.                                                   |

## Types

There are no types to import in JavaScript. Each shape is a JSDoc `@typedef` beside the code that uses it, under `packages/loom/src/`:

| File                      | Typedefs                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `types/definition.js`     | `WidgetDefinition`, `WidgetNode`, `ValuePath`, `ActionBinding`                        |
| `types/kit.js`            | `Kit`, `KitOptions`, `Source`, `SourceContext`, `FieldSpec`, `FieldType`, `ValueType` |
| `types/blocks.js`         | `BlockSpec`, `BlockPropSpec`, `BlockType`                                             |
| `definitions/validate.js` | `ValidationIssue`                                                                     |
| `definitions/paths.js`    | `ValueOption`                                                                         |
