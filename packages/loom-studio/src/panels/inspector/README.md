# `panels/inspector/`: the element editor's tabs

What opens beside a selected element, under its breadcrumb and actions: a tab bar and one tab at a time. Like everything in `panels/`, it takes props and emits changes; it doesn't read the studio.

| File                | What it does                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Inspector.vue`     | The tab bar, and whichever tab is open. Hides tabs a block has no use for (Actions on a block that can't be tapped). |
| `ContentTab.vue`    | Each of the block's props: bound to data, or a value typed in or picked from a list.                                 |
| `ActionTab.vue`     | What tapping runs: one of the kit's actions, and optionally the value it gets (a Repeat's `item`, say).              |
| `VisibilityTab.vue` | Show when: render only while a value is truthy, or falsy.                                                            |
| `shared.js`         | What every tab takes (`TabProps`) and emits (`TabEmits`).                                                            |

## Technically

- Every tab emits `edit(fn)`, a change to apply to the node. `ElementPopover` passes it to `editing.editNode`, which applies it to the definition.
- Adding a tab means a component taking `TabProps` and emitting `TabEmits`, and an entry in `Inspector.vue`'s `tabs`.
