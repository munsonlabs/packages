---
title: Reference
description: Every export.
navigation:
  icon: i-lucide:list
---

Loom has two entry points. An app needs only the first; editors use the second as well.

## `@munsonlabs/loom`

What an app needs: make a kit, load a library, render widgets.

```js
import {
  createKit,
  defineSource,
  defineBlock,
  provideKit,
  matchDefinition,
  getTheme,
  defineTheme,
  lightTheme,
  darkTheme,
  lightDark,
  validateDefinition,
  hasErrors,
  createLibrary,
  loadLibrary,
  LibraryError,
  Widget,
} from '@munsonlabs/loom'
import '@munsonlabs/loom/style.css'
import { videoBlock } from '@munsonlabs/loom/video'
import { iconBlock } from '@munsonlabs/loom/icon'
```

### Kits

| Export                               | Does                                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `createKit(options)`                 | A kit from `id`, `sources`, `blocks`, `themes`, `describe` and an action `guard`. Throws on clashing names. |
| `defineSource`, `defineBlock`        | Identity helpers: they return their argument.                                                               |
| `provideKit(kit, context?)`          | The default kit and context for every `<Widget>` below.                                                     |
| `matchDefinition(data, definitions)` | The first definition whose [conditions](/loom/core-concepts/matching) the data meets.                       |
| `getTheme(kit, id?)`                 | A kit's theme by id, or its default.                                                                        |

### Themes

| Export                                   | Does                                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `defineTheme`, `lightTheme`, `darkTheme` | Themes: `{ id, label, dark?, values }`. A light theme names its dark partner in `dark`. |
| `lightDark(light, dark)`                 | Writes a CSS `light-dark()` value, for one colour that differs by scheme.               |

### `<Widget>`

| Prop          | Type                          | Notes                                                          |
| ------------- | ----------------------------- | -------------------------------------------------------------- |
| `kit`         | `Kit`                         | Or `provideKit()`.                                             |
| `definition`  | `WidgetDefinition`            |                                                                |
| `definitions` | `WidgetDefinition[]`          | Used when `definition` isn't: the first that matches.          |
| `data`        | any                           | Required.                                                      |
| `index`       | `number`                      | Passed to sources. Default `0`.                                |
| `context`     | any                           | Or `provideKit()`.                                             |
| `variant`     | `string`                      | Pins a variant, or `'base'`.                                   |
| `theme`       | `string`                      | One of the kit's themes. Default: its first.                   |
| `scheme`      | `'auto' \| 'light' \| 'dark'` | Default `auto`: follows the device. Picks the theme's partner. |

Emits `variant(id)`. Slot `fallback({ data })` renders when no definition fits.

### Definitions and libraries

| Export                                      | Does                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `validateDefinition(kit, definition)`       | Every problem, base and variants. `[]` means it renders as written.                                    |
| `hasErrors(issues)`                         | Whether any issue is an error, not just a warning.                                                     |
| `createLibrary(kit, definitions, options?)` | One file of every widget, with the kit id, `publishedAt`, and the sources and blocks they need.        |
| `loadLibrary(kit, input)`                   | `{ widgets, skipped, missing, kitMismatch?, publishedAt? }`: what renders here, and what doesn't, why. |
| `LibraryError`                              | Thrown for input that isn't a library, an unknown format, or a newer version.                          |

See [Libraries](/loom/core-concepts/libraries).

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
| `tokens`, `scaleForRole`, `scaleTokens(scale)`, `tokenVar(name)`                          | Every token; which scale each role picks from; a scale's steps; `accent` → `--w-accent`.               |
| `themeForScheme(kit, id, scheme)`, `usePreferredScheme()`                                 | The theme to render with for a scheme; the device's scheme as a live ref.                              |
| `parseLightDark(value)`, `lightDark(light, dark)`                                         | Read and write CSS `light-dark()` values.                                                              |

## Types

There are no types to import in JavaScript. Each shape is a JSDoc `@typedef` beside the code that uses it, under `packages/loom/src/`:

| File                      | Typedefs                                                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types/definition.js`     | `WidgetDefinition`, `Condition`, `WidgetNode`, `WidgetVariant`, `NodeOverride`, `VariantRule`, `WidgetSize`, `ColorScheme`, `ValuePath`, `ActionBinding` |
| `types/kit.js`            | `Kit`, `KitOptions`, `Source`, `SourceContext`, `FieldSpec`, `FieldType`, `ValueType`                                                                    |
| `types/blocks.js`         | `BlockSpec`, `BlockPropSpec`, `BlockType`                                                                                                                |
| `types/guard.js`          | `ActionGuard`, `GuardedAction`                                                                                                                           |
| `theme/tokens.js`         | `Theme`, `TokenSpec`, `TokenGroup`, `TokenKind`, `TokenScale`                                                                                            |
| `theme/scheme.js`         | `SchemePreference`                                                                                                                                       |
| `definitions/validate.js` | `ValidationIssue`                                                                                                                                        |
| `definitions/library.js`  | `WidgetLibrary`, `LoadedLibrary`                                                                                                                         |
| `definitions/paths.js`    | `ValueOption`                                                                                                                                            |
