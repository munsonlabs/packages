# `blocks/icon/`: the optional Icon block

`iconBlock`, published as `@munsonlabs/loom/icon`, draws an icon by name through `@munsonlabs/sigil`, sized and coloured from design tokens.

It's its own entry point so only apps that use icons load sigil. An app opts in with `createKit({ blocks: [iconBlock] })` and registers an icon library with sigil first.

## Technically

`Icon.vue` (`LoomIcon`) renders a `<span>` that keeps the node's attributes, so it's selectable in an editor even before the SVG arrives, with sigil's icon inside it. Like `video/`, its spec and CSS sit in the SFC, and `index.js` makes it a kit block (`defineBlock` with a `component`).
