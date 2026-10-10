# @munsonlabs/loom — Agent Guide

## Package purpose

Renders widget **definitions** (JSON trees of blocks) against a **kit** (an app's sources and blocks). It is deliberately domain-free: nothing here may know about stories, products or any app's data. App-specific code lives in kits. Its only internal dependency is `@munsonlabs/shipkit` (tooling).

## Public API

Everything is exported from `src/index.js`; `./style.css` is the blocks' CSS. `./editor` (`src/editor.js`) holds what only editors need. The docs site's Loom section (`docs/content/05.loom`) is the reference: keep `05.api/index.md` in step with `src/index.js`.

## Layout

Each folder under `src/` has a README with its files and how they work.

```
src/
  index.js       the public API for apps: kits, validation, <Widget>
  editor.js      @munsonlabs/loom/editor: the helpers editors need (bindings in scope, defaults for new nodes)
  Widget.vue     <Widget>: sets the definition's vars on the root, provides the renderer
  WidgetNode.vue draws one node (if, props, block) and recurses into its children
  renderer.js    createRenderer: lazy sources, readValue(path, locals), clickHandler (runs actions)
  types/         definition.js, blocks.js, kit.js: every shape, no runtime code
  kit/           createKit.js, provide.js (provideKit/inject*), lookup.js (blockDefaults)
  blocks/        builtin/ (the 15 built-ins, one SFC each: spec, template, CSS; index.js gathers builtinBlocks)
  definitions/   paths.js, validate.js
  theme/         styles.css
test/            mirrors src/; fixtures.js (a small shop kit) is imported as @test/fixtures
```

## Invariants

- **Definitions are JSON.** No functions, no class instances. Editors rely on `JSON.stringify` round-trips.
- **Sources set up lazily, once per widget**, inside an effect scope owned by the `<Widget>`. `SourceContext` uses getters so composables reading it in `computed` stay reactive; never destructure it in `Widget.vue` or `renderer.js`.
- **Actions without `arg` are called with no arguments.** Passing the DOM event would land in optional parameters like `openArticle(story?)`.
- **A node with a click handler stops propagation**, so nested actions don't trigger clickable ancestors.
- **`item` and `repeat` are reserved source ids**: inside a `Repeat` they're the current item and its position (declared once, in `Repeat.vue`: `positionFields` lists them for editors, `repeatPosition` builds them).
- **A missing bound value renders as `null`, never the prop's default** (`?? null` in `WidgetNode.vue`): Vue would fill `undefined` with the default, and a card with no summary would say "Text".
- **Blocks read `--w-*` variables, never raw values.** A new visual value is a variable with a default in `theme/styles.css`.
- **Keep the main entry small.** Something only an editor needs goes in `editor.js`, not `index.js`; something nothing outside loom uses isn't exported at all.
- **Kits are values.** No module-level registries; two kits must be able to share a page.

## Testing

`vp test` (happy-dom). Tests mirror `src/` (see `test/README.md`): `widget.spec.js` for rendering, actions, kits and custom blocks; `blocks/` and `definitions/` for the rest. Use the shop kit in `test/fixtures.js`; never import from the demos.
