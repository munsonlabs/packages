# `kit/`: what an app plugs in

A kit is how an app gives loom its data and behaviour: its **sources** (composables that provide values and actions), any extra **blocks**, **kinds** (which data each widget is for), **themes**, and an optional **guard** for actions. Loom never imports app code; it only ever sees a kit.

| File           | What it does                                                                                                                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createKit.js` | `createKit(options)` checks and builds a kit: source ids are unique and not the reserved `item` or `repeat`, kit blocks don't reuse built-in names and come with a component. Also `defineSource`, `defineKind`, `defineBlock`, which only add types. |
| `provide.js`   | `provideKit(kit, context)` makes a kit and its context the default for every `<Widget>` below a component; `injectKit` and `injectContext` read them back.                                                                                            |
| `lookup.js`    | Finding things in a kit: `getKind`, `matchKind(data)`, `matchDefinition(data, definitions)` (the widget for some data), `getTheme`, `blockDefaults`, and `createDefinition` (a new widget from a kind's starter).                                     |
| `index.js`     | Re-exports the above.                                                                                                                                                                                                                                 |

## Technically

- A kit is a plain value, not a registry. Two kits can share a page, which is also how the demos run two apps side by side.
- A source's `setup` runs lazily, the first time a widget binding reaches it, inside the widget's own effect scope, so its `computed`s and watchers stop when the widget unmounts. That code is in `renderer.js`; the types are in `types/kit.js`.
- `kit.guard` is called from `renderer.js` before every action. See `types/guard.js`.

## Used by

`Widget.vue` and `renderer.js` (to render), `definitions/` (to validate and list bindings), and Loom Studio (to build its editors).
