# `src/`: how loom is laid out

Loom turns a widget's JSON (a **definition**) into Vue, using what an app plugs in (a **kit**). Each folder here is one part of that job.

```
src/
  index.js       the public API for apps: kits and <Widget>
  Widget.vue     <Widget>: sets the definition's vars on the root, and the one place every part below comes together
  WidgetNode.vue one node of the tree, and through itself its children: checks `if`, resolves props, draws the block
  renderer.js    what every node of one widget shares: its sources, path → value, tap → action
  types/         the shapes of everything: definitions, kits, blocks
  kit/           making a kit and sharing it with widgets
  blocks/        the 5 built-in blocks, one file each (what it accepts, the HTML it draws, its CSS)
  definitions/   working with definitions: bindings and actions
  theme/         the variable defaults and the shared CSS
```

## How a render flows through them

1. An app makes a kit (`kit/`) from its composables, and loads definitions.
2. `<Widget>` (`Widget.vue`) gets a definition and some data. It sets the definition's `vars` on the root (`theme/`), and provides a renderer (`renderer.js`) that reads each binding through the kit's sources (`definitions/paths.js`).
3. `<WidgetNode>` (`WidgetNode.vue`) walks the tree: each node becomes one of the block components (`blocks/builtin/`, one SFC each), its props checked against the block's spec (which the SFC exports beside its template).
4. A tap runs the action its node binds (`clickHandler` in `renderer.js`).

## Rules of the road

- Loom knows nothing about any app's data. Anything about stories, products or paywalls belongs in a kit.
- Definitions are plain JSON. Nothing here may need a function or class inside one.
- Each folder has a README like this one, saying what it holds and how it works.
