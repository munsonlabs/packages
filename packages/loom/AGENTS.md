# @munsonlabs/loom — Agent Guide

## Package purpose

Renders widget **definitions** (JSON trees of blocks) against a **kit** (an app's sources, blocks and kinds). It is deliberately domain-free: nothing here may know about stories, products or any app's data. App-specific code lives in kits. Its only internal dependency is `@munsonlabs/shipkit` (tooling).

## Public API

Everything is exported from `src/index.js`; `./style.css` is the blocks' CSS. `./editor` (`src/editor.js`) holds what only editors need. The docs site's Loom section (`docs/content/05.loom`) is the reference: keep `05.api/index.md` in step with `src/index.js`.

## Layout

Each folder under `src/` has a README with its files and how they work.

```
src/
  index.js       the public API for apps: kits, themes, validation, libraries, <Widget>
  editor.js      @munsonlabs/loom/editor: the helpers editors need (bindings in scope, variant diffs, token scales)
  Widget.vue     <Widget>: picks the definition and variant, themes the root, provides the renderer
  WidgetNode.vue draws one node (if, props, block) and recurses into its children
  renderer.js    createRenderer: lazy sources, readValue(path, locals), clickHandler (runs the guard)
  types/         definition.js, blocks.js, kit.js, guard.js: every shape, no runtime code
  kit/           createKit.js, provide.js (provideKit/inject*), lookup.js (kinds, themes, blockDefaults)
  blocks/        builtin/ (the 15 built-ins, one SFC each: spec, template, CSS; index.js gathers builtinBlocks)
  definitions/   paths.js, variants.js, validate.js, library.js
  theme/         tokens.js, scheme.js, lightDark.js, styles.css
test/            mirrors src/; fixtures.js (a small shop kit) is imported as @test/fixtures
```

## Invariants

- **Definitions are JSON.** No functions, no class instances. Editors rely on `JSON.stringify` round-trips.
- **Sources set up lazily, once per widget**, inside an effect scope owned by the `<Widget>`. `SourceContext` uses getters so composables reading it in `computed` stay reactive; never destructure it in `Widget.vue` or `renderer.js`.
- **Actions without `arg` are called with no arguments.** Passing the DOM event would land in optional parameters like `openArticle(story?)`.
- **A node with a click handler stops propagation**, so nested actions don't trigger clickable ancestors.
- **Variants never mutate the base.** `variantTree` in `definitions/variants.js` copies every node it touches (see the comment on `applyOverride`); a test snapshots the base around `applyVariant`.
- **Structure belongs to the base.** Overrides can't add or move nodes between parents; only `hidden` and `order`.
- **`item` and `repeat` are reserved source ids**: inside a `Repeat` they're the current item and its position (declared once, in `Repeat.vue`: `positionFields` lists them for editors, `repeatPosition` builds them).
- **A missing bound value renders as `null`, never the prop's default** (`?? null` in `WidgetNode.vue`): Vue would fill `undefined` with the default, and a card with no summary would say "Text".
- **Blocks read tokens, never raw values.** A new visual value is a token in `theme/tokens.js` _and_ a default in `theme/styles.css`; `test/theme/tokens.spec.js` fails if they drift, or if any CSS, a block's `<style>` included, reads a token that doesn't exist.
- **Theme, then definition vars, then variant vars**, all inline on the root (`Widget.vue`). Keep colours in themes; definitions override them only when the widget is that colour in every theme.
- **One media query for every widget.** `usePreferredScheme` shares a single `prefers-color-scheme` listener, counted in and out by widget scopes.
- **Warnings render; errors don't.** `severity: 'warning'` is for things that work but probably aren't meant (a pinned colour under a dark theme); editors shouldn't block on them.
- **Libraries load what they can.** `loadLibrary` skips widgets with errors (reporting why) rather than failing the file, so an older app survives a newer library; it throws only for input that isn't a library or a format version it can't read. Bump `LIBRARY_VERSION` only for changes an old reader would misread.
- **Every action goes through the kit's `guard` first** (`clickHandler` in `renderer.js`): one place for paywalls and the like, so widgets and composables never re-check. Keep it the only path that runs an action.
- **Keep the main entry small.** Something only an editor needs goes in `editor.js`, not `index.js`; something nothing outside loom uses isn't exported at all.
- **Kits are values.** No module-level registries; two kits must be able to share a page.

## Testing

`vp test` (happy-dom). Tests mirror `src/` (see `test/README.md`): `widget.spec.js` for rendering, actions, the guard and custom blocks; `blocks/`, `definitions/` and `theme/` for the rest. Use the shop kit in `test/fixtures.js`; never import from the demos.
