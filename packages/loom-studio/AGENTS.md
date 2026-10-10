# @munsonlabs/loom-studio — Agent Guide

## Package purpose

`<LoomStudio>`, the editor for `@munsonlabs/loom` definitions, built with Nuxt UI. Canvas first: the widget fills the screen, editing happens in a popover anchored to the clicked element, and everything else lives in floating bars. **No sidebars**: that is a product decision, keep it.

## Nuxt UI

Components are used by **auto-import only**, never imported from `@nuxt/ui/components/*.vue`: explicit imports get Nuxt UI's Nuxt builds of `UIcon`/`ULink`, which pull in `@nuxt/icon` and break outside Nuxt. The host app runs Nuxt UI's Vite plugin with `scanPackages: ['@munsonlabs/loom-studio']`. Composables (`useToast`, `defineShortcuts`) are imported from `@nuxt/ui/composables`. `@nuxt/ui` and `@munsonlabs/loom` stay external in the pack build. The studio imports editor helpers from `@munsonlabs/loom/editor`, and exports only `LoomStudio`.

## Layout

Each folder under `src/` has a README with its files and how they work.

```
src/
  LoomStudio.vue   the shell: createStudio, provideStudio, shortcuts, layout
  studio.js        createStudio wires the composables into one reactive object; useStudio() reads it
  editing/         tree.js (pure), useHistory, useVariantEditing, useTreeEditing
  canvas/          StudioCanvas.vue, ElementPopover.vue, useSelection
  preview/         usePreview (sample, width, theme, scheme, rules)
  panels/          inspector/ (Inspector + one component per tab), StyleEditor, TokensEditor, TokenInput, KeyValueEditor, VariantsPanel, OverrideMark, options.js: props in, events out, no studio
  bars/            IdentityBar, DocumentBar, ThemePopover, IssuesPopover, PreviewBar, StatusHints
  dialogs/         ExportModal, ImportModal
test/              mirrors src/; fixtures.js has a tiny kit and inScope()
```

Components in `canvas/`, `bars/` and `dialogs/` take what they need from `useStudio()`, which is grouped by owner: `s.history`, `s.variants`, `s.selection`, `s.editing`, `s.preview`, `s.open`. A new concern gets its own composable, called from `createStudio`, rather than more code in a component.

## How editing works

- Every edit goes through `change(fn)` (`editing/useHistory.js`): `update()` clones the definition, applies `fn`, and `checkpoint` pushes the old one onto the undo stack. Never mutate `definition.value` in place.
- **Variant edits are diffs.** The inspector edits a clone of the resolved node; `diffAsOverride(base, edited, previous)` stores the minimal override. Moves write the parent's `order`; delete toggles `hidden`. Structural tools are disabled while a variant is active.
- The popover anchors to the element found by `[data-node-id]` in the stage, relocated after every render (`locate()`). A node that isn't rendered (hidden in the variant, or its `if` false) anchors to its nearest rendered ancestor instead, and the popover says why (`offscreen`).
- `clone` is JSON-based on purpose: `structuredClone` throws on Vue's reactive proxies.

## Checking

`vp check` and `vp test` (the editing and preview composables). Try UI changes in `apps/demos/loom-studio` (`vp run --filter loom-studio-demo dev`).
