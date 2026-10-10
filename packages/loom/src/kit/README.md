# `kit/`: what an app plugs in

A kit is how an app gives loom its data and behaviour: its **sources** (composables that provide values and actions) any extra **blocks**, and **themes**. Loom never imports app code; it only ever sees a kit.

| File           | What it does                                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createKit.js` | `createKit(options)` checks and builds a kit: source ids are unique and not the reserved `item` or `repeat`, kit blocks don't reuse built-in names and come with a component. |
| `provide.js`   | `provideKit(kit, context)` makes a kit and its context the default for every `<Widget>` below a component; `injectKit` and `injectContext` read them back.                    |
| `lookup.js`    | Finding things in a kit: `getTheme` and `blockDefaults`.                                                                                                                      |
| `index.js`     | Re-exports the above.                                                                                                                                                         |

## Technically

- A kit is a plain value, not a registry. Two kits can share a page.
- A source's `setup` runs lazily, the first time a widget binding reaches it, inside the widget's own effect scope, so its `computed`s and watchers stop when the widget unmounts. That code is in `renderer.js`; the types are in `types/kit.js`.

## Used by

`Widget.vue` and `renderer.js` (to render), `definitions/` (to validate and list bindings), and editors (to build their forms).
