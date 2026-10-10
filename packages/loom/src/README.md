# `src/`: how loom is laid out

Loom turns a widget's JSON (a **definition**) into Vue, using what an app plugs in (a **kit**). Each folder here is one part of that job.

```
src/
  index.js       the public API for apps: kits, themes, validation, libraries, <Widget>
  editor.js      @munsonlabs/loom/editor: what editors need on top (bindings in scope, variant diffs, token scales)
  Widget.vue     <Widget>: picks the definition and variant, themes the root, and the one place every part below comes together
  WidgetNode.vue one node of the tree, and through itself its children: checks `if`, resolves props, draws the block
  renderer.js    what every node of one widget shares: its sources, path → value, tap → guard → action
  types/         the shapes of everything: definitions, kits, blocks, guards
  kit/           making a kit, sharing it with widgets, and finding things in it
  blocks/        the 15 built-in blocks, one file each (what it accepts, the HTML it draws, its CSS), plus Video and Icon
  definitions/   working with definitions: bindings, matching, variants, validation, libraries
  theme/         design tokens, themes, light and dark, and the shared CSS
```

## How a render flows through them

1. An app makes a kit (`kit/`) from its composables, and loads definitions, usually a library (`definitions/library.js`).
2. `<Widget>` (`Widget.vue`) gets a definition and some data. It picks the variant (`definitions/variants.js`), themes the root (`theme/`), and provides a renderer (`renderer.js`) that reads each binding through the kit's sources (`definitions/paths.js`).
3. `<WidgetNode>` (`WidgetNode.vue`) walks the tree: each node becomes one of the block components (`blocks/builtin/`, one SFC each), its props checked against the block's spec (which the SFC exports beside its template).
4. A tap goes through the kit's guard (`types/guard.js`, run in `renderer.js`) before the action runs.

Editors such as Loom Studio use the same pieces without rendering: `definitions/validate.js` to find problems, `definitions/paths.js` to list what a field can bind to, each block's spec (`kit.blocks`) to build forms.

## Rules of the road

- Loom knows nothing about any app's data. Anything about stories, products or paywalls belongs in a kit.
- Definitions are plain JSON. Nothing here may need a function or class inside one.
- Each folder has a README like this one, saying what it holds and how it works.
