---
title: Reference
description: Every export.
navigation:
  icon: i-lucide:list
---

## `@munsonlabs/loom`

What an app needs: make a kit, render widgets.

```js
import { createKit, defineSource, provideKit, Widget } from '@munsonlabs/loom'
import '@munsonlabs/loom/style.css'
```

### Kits

| Export                      | Does                                                    |
| --------------------------- | ------------------------------------------------------- |
| `createKit(options)`        | A kit from `sources`. Throws on clashing names.         |
| `defineSource`              | Identity helper that types its argument.                |
| `provideKit(kit, context?)` | The default kit and context for every `<Widget>` below. |

### `<Widget>`

| Prop         | Type               | Notes                           |
| ------------ | ------------------ | ------------------------------- |
| `kit`        | `Kit`              | Or `provideKit()`.              |
| `definition` | `WidgetDefinition` | Required.                       |
| `data`       | any                | Required.                       |
| `index`      | `number`           | Passed to sources. Default `0`. |
| `context`    | any                | Or `provideKit()`.              |

## Types

There are no types to import in JavaScript. Each shape is a JSDoc `@typedef` beside the code that uses it, under `packages/loom/src/`:

| File                  | Typedefs                                                                              |
| --------------------- | ------------------------------------------------------------------------------------- |
| `types/definition.js` | `WidgetDefinition`, `WidgetNode`, `ValuePath`                                         |
| `types/kit.js`        | `Kit`, `KitOptions`, `Source`, `SourceContext`, `FieldSpec`, `FieldType`, `ValueType` |
| `types/blocks.js`     | `BlockSpec`, `BlockPropSpec`, `BlockType`                                             |
