# `blocks/builtin/`: the HTML of each built-in block

One single-file component per block. Each exports its spec (what it accepts), takes its props from it, and draws its HTML with its own CSS; it holds no state and knows nothing about bindings, sources or the kit. `<Widget>` resolves all of that first and hands the block plain values.

| File         | What it does                                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Stack.vue`  | A flex row or column of its children.                                                                                                    |
| `Repeat.vue` | Its slot once per item, passing `{ item, repeat }`, laid out as a row or column. Declares the `repeat.*` fields once (`positionFields`). |
| `Text.vue`   | `h3`, `h4` or `p` by style, with a prefix, suffix and line clamp. Nothing when the text is blank.                                        |
| `Image.vue`  | A lazy image in a ratio box. Nothing without a `src`.                                                                                    |
| `Button.vue` | A button with an active state and label.                                                                                                 |
| `shared.js`  | `blockProps(spec)` (Vue props from a spec), and the small helpers the templates share (`toText`, `isBlank`, …).                          |
| `index.js`   | `builtinBlocks`: block type → its spec and component.                                                                                    |

## Technically

- One file per block, in four parts: a plain `<script>` exporting its `spec`; a `<script setup>` calling `defineProps(blockProps(spec))`, so props and defaults are written once; the template; and a `<style>` with its rules. The style isn't scoped: its classes are `w-*` already.
- Each has one root element, so whatever the node carries (`data-node-id`, its `style`, an `is-clickable` class, the click handler) falls through onto it, after the block's own class and style.
- A block that draws nothing (blank text, no image, an empty list) uses `v-if` on its root.
- Text-bearing blocks use `v-text` rather than `{{ }}` so formatting the template can never add whitespace to the output.
