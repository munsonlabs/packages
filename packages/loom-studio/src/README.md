# `src/`: how Loom Studio is laid out

`<LoomStudio>` edits one loom widget (a JSON definition) on a canvas: click anything to edit it, with no sidebars. The editor is split by job, and every part reads the same shared **studio** object.

```
src/
  index.js         the public API: LoomStudio
  LoomStudio.vue   the shell: builds the studio, provides it, sets the shortcuts, lays out the parts
  studio.js        createStudio: wires the composables below into one object; useStudio() reads it
  editing/         changing the definition: undo, tree edits, the pure tree helpers
  canvas/          the widget on screen: selection, the element popover
  preview/         how it's previewed: sample and width
  panels/          the forms inside popovers: the Inspector
  bars/            the floating toolbars around the canvas
```

## How it fits together

1. `LoomStudio.vue` calls `createStudio(definition, props)` (`studio.js`), which calls each composable (`useHistory`, `useSelection`, `useTreeEditing`, `usePreview`) and returns one reactive object.
2. It passes that object down with `provideStudio`. Every component in `canvas/` and `bars/` starts with `const s = useStudio()` and uses only what it needs. The object is grouped by owner, so it's clear where each thing comes from:

   | On the studio | Comes from                  | For example                                      |
   | ------------- | --------------------------- | ------------------------------------------------ |
   | `s.history`   | `editing/useHistory.js`     | `s.history.change(fn)`, `s.history.undo()`       |
   | `s.selection` | `canvas/useSelection.js`    | `s.selection.selected`, `s.selection.select(id)` |
   | `s.editing`   | `editing/useTreeEditing.js` | `s.editing.add('Text')`, `s.editing.remove()`    |
   | `s.preview`   | `preview/usePreview.js`     | `s.preview.sampleIndex`, `s.preview.viewport`    |

   Plus `s.props` and `s.definition`, and `onStageClick`, which turns a click on the canvas into a selection.

3. Components in `panels/` don't read the studio: they take props and emit changes, so they work in any editor.

## Rules of the road

- **Every change goes through `s.history.change(fn)` or `s.history.checkpoint(next)`** (`editing/useHistory.js`), which works on a copy and keeps the previous version for undo. Never change the definition in place.
- **No sidebars.** Everything opens where you're working: popovers and bars. It's a product decision.
- **Nuxt UI by auto-import only.** Components like `UButton` aren't imported; the host app's Nuxt UI plugin scans this package. See `AGENTS.md`.
