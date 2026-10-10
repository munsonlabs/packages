# `blocks/`: the pieces widgets are built from

Every node in a definition is a block: a Stack, a Text, an Image, a Button. This folder holds the 5 built-ins, one file each: what the block **accepts**, the **HTML** it draws, and its **CSS**.

| File / folder | What it does                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `builtin/`    | One SFC per built-in block (`Stack.vue`, `Text.vue`, …), holding all of it: its spec (its label, icon, description, whether it holds children, whether it can be tapped (`clickable`), and its props, each with type, default, what it can be bound to), the template that turns its props into HTML, and its CSS. `index.js` gathers them into `builtinBlocks`, each spec with its `component`. Editors build their forms from it. |
| `index.js`    | Re-exports `builtinBlocks`.                                                                                                                                                                                                                                                                                                                                                                                                         |

## Technically

- Props and defaults are written once, in the `spec` each SFC exports from a plain `<script>`. Its `<script setup>` takes its Vue props from that with `defineProps(blockProps(spec))` (`builtin/shared.js`), so the editor and the HTML can't disagree.
- `builtinBlocks` holds each spec with its `component`, and `<Widget>` draws every node with its spec's `component`.
- Props have no Vue `type` on purpose: Boolean casting would turn a missing prop into `false` before its default applies.
- A block draws its own class (`w-stack`) and layout styles. Everything else the node carries (`data-node-id`, its `style`, an `is-clickable` class, `onClick`) falls through to the block's root element.
- Blocks read only `--w-*` variables (`var(--w-gap)`), never fixed values, so a definition's `vars` restyle them. Each block's CSS is in its SFC's `<style>`, not scoped since its classes are `w-*` already; `theme/styles.css` holds the defaults they read, and the few rules several blocks share.

## Adding a built-in block

Add one SFC to `builtin/` like the others: its spec in a plain `<script>` (`export const spec = { type, label, … }`), `defineProps(blockProps(spec))` in its `<script setup>`, its template, and its CSS (reading variables only) in its `<style>`. Then add it to `builtinBlocks` in `builtin/index.js`; nothing else lists the built-ins.
